package app.folio.preview;

import java.io.*;
import java.util.*;

/** Bounded file staging for encrypted sync and relationship ZIP; no caller-chosen filesystem path. */
final class OfflineTransfer {
  static final long MAX=48L*1024*1024;
  private final File directory;private File file;private String token,filename;private long size;private boolean sealed;
  OfflineTransfer(File directory){this.directory=directory;}
  synchronized String begin(String filename)throws Exception{
    if(!filename.matches("folio-sync-[0-9-]{10,24}\\.folio")&&!filename.matches("folio-relationships-[0-9]{4}-[0-9]{2}-[0-9]{2}\\.zip"))throw new IOException("导出文件名无效");
    if(token!=null)throw new IOException("已有同步文件正在保存");if(!directory.exists()&&!directory.mkdirs())throw new IOException("无法创建本机暂存目录");
    token=UUID.randomUUID().toString();this.filename=filename;file=new File(directory,token+".tmp");size=0;sealed=false;
    try(FileOutputStream out=new FileOutputStream(file)){out.flush();}catch(Exception e){token=null;file=null;throw e;}return token;
  }
  private void check(String candidate)throws Exception{if(token==null||!token.equals(candidate))throw new IOException("同步导出已过期");}
  synchronized long append(String candidate,long offset,String encoded)throws Exception{
    check(candidate);if(sealed||offset!=size||encoded.length()>360000)throw new IOException("同步文件分片顺序无效");
    byte[] bytes;try{bytes=Base64.getDecoder().decode(encoded);}catch(IllegalArgumentException e){throw new IOException("同步文件分片无效");}
    if(bytes.length==0||bytes.length>256*1024||size+bytes.length>MAX)throw new IOException("同步文件过大");
    try(FileOutputStream out=new FileOutputStream(file,true)){out.write(bytes);}size+=bytes.length;return size;
  }
  synchronized File finish(String candidate)throws Exception{check(candidate);if(size==0)throw new IOException("同步文件为空");sealed=true;return file;}
  synchronized String filename(String candidate)throws Exception{check(candidate);return filename;}
  synchronized void clear(String candidate){if(token!=null&&token.equals(candidate)){if(file!=null)file.delete();file=null;token=null;size=0;sealed=false;}}
}
