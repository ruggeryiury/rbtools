"""
STFS Script taken from "py360" repository by GitHub user arkem, ported to Python3 by valmyzk and typed by ruggeryiury.

arkem's "py360" repository:
https://github.com/arkem/py360

valmyzk's "py360" fork:
https://github.com/valmyzk/py360

Secure Transacted File System - A container format found on Xbox 360 XTAF partitions
See http://free60.org/STFS
"""

import struct
import hashlib
from io import BufferedReader, BytesIO as StringIO
from typing import Dict, List


class STFSHashInfo(object):
    """Whether the block represented by the BlockHashRecord is used, free, old or current."""

    types = {0x00: "Unused", 0x40: "Freed", 0x80: "Old", 0xC0: "Current"}
    types_list = [
        "Unused",
        "Allocated Free",
        "Allocated In Use Old",
        "Allocated In Use Current",
    ]


class ContentTypes:
    """STFS Content Types mapping."""

    types = {
        0xD0000: "Arcade Title",
        0x9000: "Avatar Item",
        0x40000: "Cache File",
        0x2000000: "Community Game",
        0x80000: "Game Demo",
        0x20000: "Gamer Picture",
        0xA0000: "Game Title",
        0xC0000: "Game Trailer",
        0x400000: "Game Video",
        0x4000: "Installed Game",
        0xB0000: "Installer",
        0x2000: "IPTV Pause Buffer",
        0xF0000: "License Store",
        0x2: "Marketplace Content",
        0x100000: "Movie",
        0x300000: "Music Video",
        0x500000: "Podcast Video",
        0x10000: "Profile",
        0x3: "Publisher",
        0x1: "Saved Game",
        0x50000: "Storage Download",
        0x30000: "Theme",
        0x200000: "TV",
        0x90000: "Video",
        0x600000: "Viral Video",
        0x70000: "Xbox Download",
        0x5000: "Xbox Original Game",
        0x60000: "Xbox Saved Game",
        0x1000: "Xbox 360 Title",
        0x5000: "Xbox Title",
        0xE0000: "XNA",
    }


class BlockHashRecord(object):
    """Object containing the SHA1 hash of a block as well as its free/used information and next block."""

    def __eq__(self, other) -> bool:
        if other.hash == self.hash:
            return True
        else:
            return False

    def __str__(self) -> str:
        return "STFS Block %d Hash Record: %s / %d" % (
            self.blocknum,
            " ".join([hex(ord(c)) for c in self.hash]),
            self.nextblock,
        )

    def __init__(self, blocknum: int, data: bytes, table=0, record=0) -> None:
        assert len(data) == 0x18, "BlockHashRecord data of an incorrect length"
        self.record = record
        self.table = table
        self.blocknum = blocknum
        self.hash = data[:0x14]
        self.info = data[0x14]
        self.nextblock: int = struct.unpack(">I", bytes([0x00]) + data[0x15:0x18])[0]
        assert self.info in STFSHashInfo.types, "BlockHashRecord type is unknown"


class FileListing(object):
    """Object containing the information about a file in the STFS container
    Data includes size, name, path and firstblock and atime and utime
    """

    def __str__(self) -> str:
        return "STFS File Listing: %s" % self.filename

    def __init__(self, data: bytes):
        self.filename = data[:0x28].strip(bytes([0x00]))
        assert self.filename != "", "FileListing has empty filename"
        self.isdirectory = 0x80 & (data[0x28]) == 0x80
        self.numblocks: int = struct.unpack(
            "<I", data[0x29 : 0x29 + 3] + bytes([0x00])
        )[
            0
        ]  # More little endian madness!
        self.firstblock: int = struct.unpack(
            "<I", data[0x2F : 0x2F + 3] + bytes([0x00])
        )[
            0
        ]  # And again!
        self.pathindex: int = struct.unpack(">h", data[0x32:0x34])[
            0
        ]  # Signedness is important here
        self.size: int = struct.unpack(">I", data[0x34:0x38])[0]
        self.udate: int = struct.unpack(">H", data[0x38:0x3A])[0]
        self.utime: int = struct.unpack(">H", data[0x3A:0x3C])[0]
        self.adate: int = struct.unpack(">H", data[0x3C:0x3E])[0]
        self.atime: int = struct.unpack(">H", data[0x3E:0x40])[0]


class STFS(object):
    """Object representing the STFS container. allfiles dict contains a path to filelisting map"""

    def __str__(self) -> str:
        return "STFS Object %s (%s)" % (self.magic, self.filename)

    def __init__(self, filename: str, fd: BufferedReader | None = None) -> None:
        """Takes either a filename to open or a file object (including StringIO) to parse"""
        self.filename = filename
        if not fd:
            self.fd = open(filename, "rb")
        else:
            self.fd = fd
        data = self.fd.read(4)
        assert data in (b"CON ", b"PIRS", b"LIVE"), "STFS Magic not found"

        self.table_spacing = [
            (0xAB, 0x718F, 0xFE7DA),  # The distance in blocks between tables
            (0xAC, 0x723A, 0xFD00B),
        ]  # For when tables are 1 block and when they are 2 blocks
        self.magic = data
        self.fd.seek(0)
        self.data = self.fd.read(
            0x971A
        )  # Header data (this is only a member during testing)
        self.parse_header(self.data)
        self.parse_filetable()

    def read_filetable(self, firstblock: int, numblocks: int) -> bytes:
        """Given the length and start of the filetable return all its data"""
        buf = StringIO()
        info = 0x80
        block = firstblock
        for i in range(0, numblocks):
            buf.write(self.read_block(self.fix_blocknum(block), 0x1000))
            blockhash = self.get_blockhash(block)
            if self.table_size_shift > 0 and blockhash.info < 0x80:
                blockhash = self.get_blockhash(block, 1)
            block = blockhash.nextblock
            info = blockhash.info
        return buf.getvalue()

    def parse_filetable(self) -> None:
        """Generate objects for all the filelistings"""
        data = StringIO()
        self.filelistings: List[FileListing] = []
        self.allfiles: Dict[str, FileListing] = {}
        # for x in range(0, self.filetable_blockcount):
        #    data.write(self.read_block(self.filetable_blocknumber + x))
        # data = data.getvalue()
        data = self.read_filetable(
            self.filetable_blocknumber, self.filetable_blockcount
        )

        for x in range(0, len(data), 0x40):  # File records are 0x40 length
            try:
                self.filelistings.append(FileListing(data[x : x + 0x40]))
            except AssertionError:
                pass
        for (
            fl
        ) in self.filelistings:  # Build a dictionary to access filelistings by path
            path_components = [fl.filename]
            a = fl
            while a.pathindex != -1 and a.pathindex < len(self.filelistings):
                try:
                    a = self.filelistings[a.pathindex]
                    path_components.append(a.filename)
                except IndexError:
                    raise AssertionError(
                        "IndexError: %s %d %d"
                        % (self.filename, a.pathindex, len(self.filelistings))
                    )
            path_components.append(b"")
            path_components.reverse()
            self.allfiles["/".join((x.decode("UTF-8") for x in path_components))] = fl

    def read_file(self, filelisting: FileListing, size=-1):
        """Given a filelisting object return its data
        This requies checking each blockhash to find the next block.
        In some cases this requires checking two different hash tables.
        """
        buf = StringIO()
        if size == -1:
            size = filelisting.size
        block = filelisting.firstblock
        info = 0x80
        while size > 0 and block > 0 and block < self.allocated_count and info >= 0x80:
            readlen = min(0x1000, size)
            buf.write(self.read_block(self.fix_blocknum(block), readlen))
            size -= readlen
            blockhash = self.get_blockhash(
                block
            )  # TODO: Optional concurrent verification of blocks
            # If there are multiple tables and the block is free or unused, try other table
            # TODO: There may be times where both tables show allocated blocks yet only one was correct
            #      It would be better to calculate the best chain of blocks, perhaps precalculate like Partition
            if self.table_size_shift > 0 and blockhash.info < 0x80:
                blockhash = self.get_blockhash(block, 1)
            block = blockhash.nextblock
            info = blockhash.info
        return buf.getvalue()

    def get_blockhash(self, blocknum: int, table_offset=0) -> BlockHashRecord:
        """Given a block number return the hash object that goes with it"""
        record = blocknum % 0xAA
        # Num tables * space blocks between each (0xAB or 0xAC for [0])
        tablenum = blocknum // 0xAA * self.table_spacing[self.table_size_shift][0]
        if blocknum >= 0xAA:
            tablenum += (
                blocknum // 0x70E4 + 1
            ) << self.table_size_shift  # skip level 1 tables
            if blocknum >= 0x70E4:
                tablenum += (
                    1 << self.table_size_shift
                )  # If we're into level 2 add the level 2 table

        # Read the table block, get the correct record and pass it to BlockHashRecord

        # Fix to point at the first table (these numbers are offset from data block numbers)
        tablenum += table_offset - (1 << self.table_size_shift)
        hashdata = self.read_block(tablenum)
        return BlockHashRecord(
            blocknum,
            hashdata[record * 0x18 : record * 0x18 + 0x18],
            table=tablenum,
            record=record,
        )

    def verify_block(self, blockhash: BlockHashRecord) -> bool:
        """Check the data in the block versus its recorded hash"""
        data = self.read_block(self.fix_blocknum(blockhash.blocknum))
        if blockhash.hash == hashlib.sha1(data).digest():
            return True
        else:
            return False

    def fix_blocknum(self, block_num: int) -> int:
        """
        Given a blocknumber calculate the block on disk that has the data taking into account hash blocks.
        Every 0xAA blocks there is a hash table and depending on header data it
        is 1 or 2 blocks long [((self.entry_id+0xFFF) & 0xF000) >> 0xC 0xB == 0, 0xA == 1]
        After 0x70e4 blocks there is another table of the same size every 0x70e4
        blocks and after 0x4af768 blocks there is one last table. This skews blocknumber to offset calcs.
        This is the part of the Free60 STFS page that needed work
        """
        block_adjust = 0

        if block_num >= 0xAA:
            block_adjust += ((block_num // 0xAA)) + 1 << self.table_size_shift
        if block_num >= 0x70E4:
            block_adjust += ((block_num // 0x70E4) + 1) << self.table_size_shift
        return block_adjust + block_num

    def read_block(self, blocknum: int, length=0x1000) -> bytes:
        """
        Read a block given its block number
        If reading data blocks call fix_blocknum first
        """
        self.fd.seek(0xC000 + blocknum * 0x1000)
        return self.fd.read(length)

    # This is a huge, messy struct parsing function.
    # There is almost no logic here, just offsets.
    def parse_header(self, data: bytes) -> None:
        """Parse the huge STFS header"""
        assert len(data) >= 0x971A, "STFS Data Too Short"
        self.magic = data[0:4]
        if self.magic == "CON ":
            self.console_id = data[6:11]
            self.console_part_number = data[0xB:0x14]
            self.console_type = data[0x1F:0x20]  # 0x02 is RETAIL 0x01 is DEVKIT
            self.certificate_date = data[0x20:0x28]
            # Not using the certificate at the moment so this blob has:
            # Exponent, modulus, cert signature, signature
            self.certificate_blob = data[0x28 : 0x1AC + 0x80]
        else:
            self.certificate_blob = data[0x4:0x104]

        self.license_entries = data[0x22C:0x22C:0x100]
        self.content_id = data[0x32C : 0x32C + 0x14]  # Header SHA1 Hash
        self.entry_id: int = struct.unpack(">I", data[0x340:0x344])[0]
        self.content_type: int = struct.unpack(">I", data[0x344:0x348])[0]
        self.metadata_version: int = struct.unpack(">I", data[0x348 : 0x348 + 0x4])[0]
        self.content_size: int = struct.unpack(">Q", data[0x34C : 0x34C + 0x08])[0]
        self.media_id: int = struct.unpack(">I", data[0x354 : 0x354 + 4])[0]
        self.version: int = struct.unpack(">I", data[0x358 : 0x358 + 4])[0]
        self.base_version: int = struct.unpack(">I", data[0x35C : 0x35C + 4])[0]
        self.title_id: int = struct.unpack(">I", data[0x360 : 0x360 + 4])[0]
        self.platform = data[0x364:0x365]
        self.executable_type = data[0x365:0x366]
        self.disc_number = data[0x366:0x367]
        self.disc_in_set = data[0x367:0x368]
        self.save_game_id: int = struct.unpack(">I", data[0x368 : 0x368 + 4])[0]
        if self.magic == "CON ":
            # assert self.console_id == data[0x36C:0x36C+5], "CON Console ID verification failed"
            pass
        else:
            self.console_id = data[0x36C : 0x36C + 5]
        self.profile_id = data[0x371:0x376]

        self.volume_descriptor_size = data[0x379:0x37A]
        self.block_seperation = data[0x37B]
        self.filetable_blockcount: int = struct.unpack(
            "<H", data[0x37A + 2 : 0x37A + 4]
        )[
            0
        ]  # Little Endian. Why?
        self.filetable_blocknumber: int = struct.unpack(
            "<I", data[0x37A + 4 : 0x37A + 7] + bytes([0x00])
        )[
            0
        ]  # Why?!?
        self.tophashtable_hash = data[0x37A + 7 : 0x37A + 7 + 0x14]
        self.allocated_count: int = struct.unpack(
            ">I", data[0x37A + 0x1B : 0x37A + 0x1B + 0x04]
        )[0]
        self.unallocated_count: int = struct.unpack(
            ">I", data[0x37A + 0x1F : 0x37A + 0x1F + 0x4]
        )[0]

        self.datafile_count: int = struct.unpack(">I", data[0x39D : 0x39D + 0x4])[0]
        self.datafile_size: int = struct.unpack(">Q", data[0x3A1 : 0x3A1 + 8])[0]
        self.device_id = data[0x3FD : 0x3FD + 0x14]

        self.display_name = data[0x411 : 0x411 + 0x80]  # First locale
        self.display_name_blob = data[0x411 : 0x411 + 0x900]  # All locales
        self.display_description = data[
            0xD11 : 0xD11 + 0x80
        ]  # This offset might be wrong, 1 desc got truncated
        self.display_description_blob = data[0xD11 : 0xD11 + 0x900]
        self.publisher_name = data[0x1611 : 0x1611 + 0x80]
        self.title_name = data[0x1691 : 0x1691 + 0x80]

        self.transfer_flags = data[0x1711:0x1712]
        self.thumbnail_size: int = struct.unpack(">I", data[0x1712 : 0x1712 + 4])[0]
        self.titleimage_size: int = struct.unpack(">I", data[0x1716 : 0x1716 + 4])[0]
        self.thumbnail = data[0x171A : 0x171A + self.thumbnail_size]
        self.titleimage = data[0x571A : 0x571A + self.titleimage_size]

        if self.metadata_version == 2:
            self.series_id = data[0x3B1 : 0x3B1 + 0x10]
            self.season_id = data[0x3C1 : 0x3C1 + 0x10]
            self.season_number: int = struct.unpack(">H", data[0x3D1 : 0x3D1 + 2])[0]
            self.episode_number: int = struct.unpack(">H", data[0x3D3 : 0x3D3 + 2])[0]
            self.additional_display_names = data[0x541A : 0x541A + 0x300]
            self.additional_display_descriptions = data[0x941A : 0x941A + 0x300]

        # Are the hash tables 1 or 2 blocks long?
        if ((self.entry_id + 0xFFF) & 0xF000) >> 0xC == 0xB:
            self.table_size_shift = 0
        else:
            self.table_size_shift = 1
