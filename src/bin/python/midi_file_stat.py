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

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='RBTools: MOGG File Stat', epilog='By Ruggery Iury Corrêa.')
  parser.add_argument('midi_file_path', help='The path to the MOGG file', type=str)
  parser.add_argument('-p', '--print-results', help='Prints the results to stdout', action=argparse.BooleanOptionalAction, default=False)

  arg = parser.parse_args()
  
  status = midi_file_stat(arg.midi_file_path)
  if arg.print_results:
    print(json.dumps(status, ensure_ascii=False))