#!/usr/bin/env python3
# -*- coding: utf-8; tab-width: 4; indent-tabs-mode: nil; py-indent-offset: 4 -*-
import argparse, os
from typing import List
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
from pathlib import Path


def channel_order_fix(audio_channels: List[AudioSegment]) -> List[AudioSegment]:
    """
    Fix the order of audio channels in a list to match the correct order.

    Parameters:
        audio_channels (List[AudioSegment]): A list of audio segments representing individual channels.

    Returns:
        List[AudioSegment]: A list of audio segments with the corrected channel order.
    """
    clength = len(audio_channels)
    if clength == 3:
        correct_audio = [audio_channels[0], audio_channels[2], audio_channels[1]]

        return AudioSegment.from_mono_audiosegments(*correct_audio).split_to_mono()
    elif clength == 5:
        correct_audio = [
            audio_channels[0],
            audio_channels[2],
            audio_channels[1],
            audio_channels[3],
            audio_channels[4],
        ]

        return AudioSegment.from_mono_audiosegments(*correct_audio).split_to_mono()
    elif clength == 6:
        correct_audio = [
            audio_channels[0],
            audio_channels[2],
            audio_channels[1],
            audio_channels[5],
            audio_channels[3],
            audio_channels[4],
        ]

        return AudioSegment.from_mono_audiosegments(*correct_audio).split_to_mono()
    elif clength == 7:
        correct_audio = [
            audio_channels[0],
            audio_channels[2],
            audio_channels[1],
            audio_channels[6],
            audio_channels[5],
            audio_channels[3],
            audio_channels[4],
        ]

        return AudioSegment.from_mono_audiosegments(*correct_audio).split_to_mono()
    elif clength == 8:
        correct_audio = [
            audio_channels[0],
            audio_channels[2],
            audio_channels[1],
            audio_channels[7],
            audio_channels[5],
            audio_channels[6],
            audio_channels[3],
            audio_channels[4],
        ]

        return AudioSegment.from_mono_audiosegments(*correct_audio).split_to_mono()
    else:
        return audio_channels


def is_valid_audio_file(file_path: str) -> bool:
    """
    Check if a file is a valid audio file.

    Args:
        file_path (str): The path to the audio file.

    Returns:
        bool: True if the file is a valid audio file, False otherwise.
    """
    try:
        AudioSegment.from_file(file_path)
        return True
    except CouldntDecodeError:
        return False


def stereo_to_mono(audio: AudioSegment) -> List[AudioSegment]:
    """
    Separate stereo audio to mono.

    Args:
        audio (AudioSegment): Stereo audio segment.

    Returns:
        List[AudioSegment]: List of mono audio segments.
    """
    channels = audio.split_to_mono()
    return channels


def map_paths_to_audio(
    file_path: str,
    backing_segment: AudioSegment,
    duration_ms: int,
    frame_rate: int,
    sample_width: int,
) -> AudioSegment:
    """
    Converts paths from a list to AudioSegments, matching the duration of the backing track.

    Args:
        file_path (str): A file path.
        duration_ms (int): The duration of the backing track
        frame_rate (int): The frame rate of the backing track
        sample_width (int): The sample width of the backing track
    """
    if file_path.endswith("stereo44.wav"):
        new_segment = AudioSegment.silent(duration=duration_ms, frame_rate=frame_rate)
        new_segment = new_segment.set_sample_width(sample_width)
        return new_segment
    elif file_path.endswith("mono44.wav"):
        new_segment = AudioSegment.silent(duration=duration_ms, frame_rate=frame_rate)
        new_segment = new_segment.set_channels(2)
        new_segment = new_segment.set_sample_width(sample_width)
        return new_segment
    else:
        return backing_segment


def join_audio_files(input_files: List[str], output_file: str) -> None:
    """
    Join multiple audio files into a single multitrack OGG file.

    Parameters
    ----------
    input_files : List[str]
      List of input audio files to be joined.
    output_file : str
      Output multitrack file path.
    """
    audio_channels = []

    # Load each input file and separate stereo to mono
    for file in input_files:
        try:
            if os.path.exists(file):
                if is_valid_audio_file(file):
                    audio = AudioSegment.from_file(file)
                    channels = stereo_to_mono(audio)
                    audio_channels.extend(channels)
                else:
                    print(f"{file} is not a valid audio file.")
            else:
                print(f"{file} does not exist.")
        except Exception as e:
            print(f"Error processing {file}: {e}")

    # Export multitrack audio to file
    try:
        multitrack = channel_order_fix(
            AudioSegment.from_mono_audiosegments(*audio_channels).split_to_mono()
        )

        AudioSegment.from_mono_audiosegments(*multitrack).export(
            Path(output_file).with_suffix(".ogg"),
            format="ogg",
            codec="libvorbis",
            parameters=["-q", str(3)],
        )
    except ValueError:
        backing_path = input_files[
            [
                i
                for i, file_path in enumerate(input_files)
                if file_path.endswith("backing.wav")
            ][0]
        ]
        backing_segment = AudioSegment.from_file(backing_path)
        backing_len = len(backing_segment)
        backing_segment = backing_segment[:backing_len]
        backing_framerate = backing_segment.frame_rate
        backing_samplewidth = backing_segment.sample_width
        new_list = list(
            map(
                lambda path: map_paths_to_audio(
                    path,
                    backing_segment,
                    backing_len,
                    backing_framerate,
                    backing_samplewidth,
                ),
                input_files,
            )
        )

        mono_list = []
        for audio in new_list:
            for segments in audio.split_to_mono():
                mono_list.append(segments)

        multitrack = channel_order_fix(
            AudioSegment.from_mono_audiosegments(*mono_list).split_to_mono()
        )

        AudioSegment.from_mono_audiosegments(*multitrack).export(
            Path(output_file).with_suffix(".ogg"),
            format="ogg",
            codec="libvorbis",
            parameters=["-q", str(3)],
        )


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="RBTools: Multitrack OGG Creator", epilog="By Ruggery Iury Corrêa."
    )
    parser.add_argument("input_files", nargs="+", help="Input audio files to be joined")
    parser.add_argument(
        "-o", "--output", default="./output.ogg", help="Output multitrack file"
    )
    args = parser.parse_args()

    join_audio_files(args.input_files, args.output)
