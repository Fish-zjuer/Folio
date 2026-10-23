package app.folio.preview;

import java.util.*;

/** Durable, encrypted by its Storage adapter. A failed write never advances the revision. */
final class RecordRepository {
  interface Storage {
    String read(String key) throws Exception;
    void write(String key,String value) throws Exception;
    default void delete(String key) throws Exception {}
  }
  static final class Snapshot {
    final long revision;
    final String data;
    final int chunks;
    Snapshot(long revision,String data){this(revision,data,0);}
    Snapshot(long revision,String data,int chunks){this.revision=revision;this.data=data;this.chunks=chunks;}
  }
  // SharedPreferences holds one string per key; split large study records instead of
  // rejecting them at 2 MB. The manifest is written last so a partial write keeps the old revision.
  private static final int CHUNK=256*1024;
  private static final int MAX=16*1024*1024;
  private final Storage storage;
  private static final String ROOT="records.bundle.v1";
  private static final List<String> NAMES=Arrays.asList("study","pomodoro","focus","learning");
  RecordRepository(Storage storage){this.storage=storage;}

  private void name(String name) throws Exception {
    if(!name.equals("study")&&!name.equals("pomodoro")&&!name.equals("focus")&&!name.equals("learning"))throw new Exception("未知记录集合");
  }
  private String manifest(String name){return "records."+name;}
  private String chunkKey(String name,long revision,int index){return "records."+name+"."+revision+"."+index;}

  private Snapshot read(String name) throws Exception {
    String bundle=storage.read(ROOT),raw;
    if(bundle!=null&&!bundle.equals("{}")){
      String[] ref=references(bundle).get(name);long rev=Long.parseLong(ref[0]);int count=Integer.parseInt(ref[1]);
      if(rev==0)return new Snapshot(0,"{}");raw=rev+"\nchunks:"+count;
    }else raw=storage.read(manifest(name));
    if(raw==null||raw.equals("{}"))return new Snapshot(0,"{}");
    int split=raw.indexOf('\n');
    if(split<1)throw new Exception("记录格式损坏，请保留应用数据");
    long revision;
    try{revision=Long.parseLong(raw.substring(0,split));}
    catch(NumberFormatException e){throw new Exception("记录版本损坏");}
    if(revision<1)throw new Exception("记录版本无效");
    String body=raw.substring(split+1);
    if(body.startsWith("chunks:")){
      int count;
      try{count=Integer.parseInt(body.substring(7));}
      catch(NumberFormatException e){throw new Exception("记录分片信息损坏");}
      if(count<1||count>1024)throw new Exception("记录分片数量无效");
      StringBuilder json=new StringBuilder();
      for(int i=0;i<count;i++){
        String chunk=storage.read(chunkKey(name,revision,i));
        if(chunk==null)throw new Exception("记录分片缺失，请保留应用数据");
        json.append(chunk);
      }
      return new Snapshot(revision,json.toString(),count);
    }
    return new Snapshot(revision,body,0);
  }

  synchronized Snapshot get(String name) throws Exception {
    name(name);
    return read(name);
  }

  synchronized Snapshot save(String name,long expected,String json) throws Exception {
    name(name);
    if(expected<0||json==null||json.length()>MAX||!json.startsWith("{"))throw new Exception("记录内容无效或过大");
    Snapshot current=read(name);
    if(current.revision!=expected)throw new Exception("记录版本冲突：已读取最新记录，请重新确认后再保存");
    if(current.revision==Long.MAX_VALUE)throw new Exception("记录版本已达上限");
    long next=current.revision+1;
    int count=Math.max(1,(json.length()+CHUNK-1)/CHUNK);
    for(int i=0;i<count;i++){
      int from=i*CHUNK,to=Math.min(json.length(),from+CHUNK);
      storage.write(chunkKey(name,next,i),json.substring(from,to));
    }
    String bundle=storage.read(ROOT);
    if(bundle!=null&&!bundle.equals("{}")){Map<String,String[]> refs=references(bundle);refs.put(name,new String[]{Long.toString(next),Integer.toString(count)});storage.write(ROOT,encode(refs));}
    else storage.write(manifest(name),next+"\nchunks:"+count);
    // Old chunk keys are not referenced by the new manifest; cleanup is best effort.
    if(current.chunks>0)for(int i=0;i<current.chunks;i++){
      try{storage.delete(chunkKey(name,current.revision,i));}catch(Exception ignored){}
    }
    return new Snapshot(next,json,count);
  }

  private Map<String,String[]> references(String raw) throws Exception {
    Map<String,String[]> refs=new LinkedHashMap<>();
    for(String line:raw.split("\n")){String[] p=line.split("\\|");if(p.length!=3||!NAMES.contains(p[0])||refs.containsKey(p[0]))throw new Exception("同步记录索引损坏");try{long revision=Long.parseLong(p[1]);int count=Integer.parseInt(p[2]);if(revision<0||count<0||count>1024||(revision==0)!=(count==0))throw new Exception();}catch(Exception e){throw new Exception("同步记录索引无效");}refs.put(p[0],new String[]{p[1],p[2]});}
    if(refs.size()!=NAMES.size())throw new Exception("同步记录索引不完整");return refs;
  }
  private String encode(Map<String,String[]> refs){StringBuilder out=new StringBuilder();for(String name:NAMES){String[] p=refs.get(name);out.append(name).append('|').append(p[0]).append('|').append(p[1]).append('\n');}return out.toString();}

  /** Stage all datasets, then publish one pointer. A partial write never publishes half an import. */
  synchronized void replace(Map<String,Long> expected,Map<String,String> values,String account,String transaction) throws Exception {
    if(account==null||!account.matches("[a-f0-9]{64}")||transaction==null||!transaction.matches("[a-zA-Z0-9-]{16,80}")||!expected.keySet().equals(new HashSet<>(NAMES))||!values.keySet().equals(new HashSet<>(NAMES)))throw new Exception("同步集合或账号无效");
    Map<String,Snapshot> current=new LinkedHashMap<>();Map<String,String[]> after=new LinkedHashMap<>();
    for(String name:NAMES){Snapshot old=read(name);String json=values.get(name);if(expected.get(name)==null||old.revision!=expected.get(name))throw new Exception("记录版本冲突，请重新预览同步文件");if(old.revision==Long.MAX_VALUE||json==null||json.length()>MAX||!json.startsWith("{"))throw new Exception("同步记录过大或无效");current.put(name,old);}
    for(String name:NAMES){Snapshot old=current.get(name);String json=values.get(name);long revision=old.revision+1;int count=Math.max(1,(json.length()+CHUNK-1)/CHUNK);for(int i=0;i<count;i++)storage.write(chunkKey(name,revision,i),json.substring(i*CHUNK,Math.min(json.length(),(i+1)*CHUNK)));after.put(name,new String[]{Long.toString(revision),Integer.toString(count)});}
    storage.write(ROOT,encode(after));
    for(String name:NAMES){Snapshot old=current.get(name);for(int i=0;i<old.chunks;i++)try{storage.delete(chunkKey(name,old.revision,i));}catch(Exception ignored){}}
  }
}
