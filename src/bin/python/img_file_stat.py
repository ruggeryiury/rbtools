import argparse, json
from PIL import Image
import puremagic

def img_file_stat(img_file_path: str) -> dict:
  try:
    magic = None
    with open(img_file_path, 'rb') as img:
      magic = puremagic.magic_string(img.read(64))[0]
    with Image.open(img_file_path) as image:
      status = {
        "ext": magic.extension,
        "extDesc": magic.name,
        "mimeType": magic.mime_type,
        "width": image.width,
        "height": image.height,
        "size": image.size,
        "imageMode": image.mode,
      }
  except Exception as e:
    raise e
    
  return status

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='RBTools: Image File Stat CLI', epilog='By Ruggery Iury Corrêa.')
  parser.add_argument('img_file_path', help='The path of the image file', type=str)
  parser.add_argument('-p', '--print_results', help='Prints the results to stdout', action=argparse.BooleanOptionalAction, default=False)

  arg = parser.parse_args()
  
  status = img_file_stat(arg.img_file_path)
  if arg.print_results:
    print(json.dumps(status, ensure_ascii=False))