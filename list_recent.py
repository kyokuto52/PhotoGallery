import os,sys,time
p='data'
if not os.path.isdir(p):
    print('no data dir')
    sys.exit(0)
files=[os.path.join(p,f) for f in os.listdir(p) if os.path.isfile(os.path.join(p,f))]
files_with_mtime=[(os.path.getmtime(f),f) for f in files]
for m,f in sorted(files_with_mtime, reverse=True)[:20]:
    print(time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(m)), f)
