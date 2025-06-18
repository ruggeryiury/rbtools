import argparse, json
from lib.stfs import STFS

def stfs_file_stat(file_path: str) -> dict:
  con = STFS(file_path)
  status = { "path": file_path, "name": str(con.display_name_blob.decode()).replace("\u0000", ""), "desc": con.display_description_blob.decode().replace("\u0000", ""), "files": [], "dta": "" }
  
  all_files = con.allfiles.keys()
  
  for file in all_files:
    if file == "/songs/":
      pass
    else:
      status['files'].append(file)
      
  dta_file = None
  dta_file_contents_bytes = None
  upg_file = None
  upg_file_contents_bytes = None
  
  try:
    dta_file = con.allfiles['/songs/songs.dta']
  except KeyError:
    pass
  
  try:
    upg_file = con.allfiles['/songs_upgrades/upgrades.dta']
  except KeyError:
    pass
  
  try:
    dta_file_contents_bytes = con.read_file(dta_file)
    
    try:
      status['dta'] = dta_file_contents_bytes.decode()
    except UnicodeDecodeError:
      status['dta'] = dta_file_contents_bytes.decode('latin-1')
  except AttributeError:
    pass
  
  try:
    upg_file_contents_bytes = con.read_file(upg_file)
    
    try:
      status['upgrades'] = upg_file_contents_bytes.decode()
    except UnicodeDecodeError:
      status['upgrades'] = upg_file_contents_bytes.decode('latin-1')
  except AttributeError:
    pass
  
  return status
  

if __name__ == '__main__':
  parser = argparse.ArgumentParser(description='Xbox 360 STFS File Stat')
  parser.add_argument('stfs_file_path', help='The STFS file you want to print its contents', type=str)
  parser.add_argument('-p', '--print-results', help='Prints the results to stdout', action=argparse.BooleanOptionalAction, default=False)

  arg = parser.parse_args()
  
  status = stfs_file_stat(arg.stfs_file_path)
  if arg.print_results:
    print(json.dumps(status, ensure_ascii=False))