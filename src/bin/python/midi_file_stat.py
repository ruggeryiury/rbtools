import argparse, json, os, struct, tempfile
from mido import MidiFile

def midi_file_stat(midi_file_path: str) -> dict:
  try:
    tracks_name: list[str] = []
    midi = MidiFile(midi_file_path)
    for track in midi.tracks[1:]:
      tracks_name.append(track.name)
    return {
      "charset": midi.charset,
      "midiType": midi.type,
      "ticksPerBeat": midi.ticks_per_beat,
      "tracksCount": len(tracks_name),
      "tracksName": tracks_name
    }
  
  except Exception as e:
    raise e
    # version = struct.unpack('<I', fin.read(4))[0]
    # fin.seek(0)
    # ogg_bytes = decrypt_mogg_bytes(True, False, fin.read())
    # temp_ogg = tempfile.NamedTemporaryFile(delete=False, suffix=".ogg")
    # try:
    #   temp_ogg.write(ogg_bytes)
    #   temp_ogg.flush()
    #   audio = mediainfo(temp_ogg.name)
      
    #   return {
    #   "bitRate": int(audio['bit_rate']),
    #   "channels": int(audio['channels']),
    #   "codec": audio['codec_name'],
    #   "codecDesc": audio['codec_long_name'],
    #   "duration": int(float(audio['duration']) * 1000),
    #   "durationSec": float(audio['duration']),
    #   "ext": audio['format_name'],
    #   "extDesc": audio['format_long_name'],
    #   "sampleRate": int(audio['sample_rate']),
    #   "size": int(audio['size']),
    #   "mogg": {
    #     "size": os.path.getsize(midi_file_path),
    #     "version": version,
    #     "isEncrypted": version != 10,
    #     "worksInPS3": version == 11
    #   }
    # }
    # except Exception as e:
    #   temp_ogg.close()
    #   os.unlink(temp_ogg.name)
    #   raise e
    # finally:
    #   temp_ogg.close()
    #   os.unlink(temp_ogg.name)
      
    

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='RBTools: MOGG File Stat', epilog='By Ruggery Iury Corrêa.')
  parser.add_argument('midi_file_path', help='The path to the MOGG file', type=str)
  parser.add_argument('-p', '--print-results', help='Prints the results to stdout', action=argparse.BooleanOptionalAction, default=False)

  arg = parser.parse_args()
  
  status = midi_file_stat(arg.midi_file_path)
  if arg.print_results:
    print(json.dumps(status, ensure_ascii=False))