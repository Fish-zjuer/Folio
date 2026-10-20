package app.folio.preview;

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
  RecordRepository(Storage storage){this.storage=storage;}

  private void name(String name) throws Exception {
    if(!name.equals("study")&&!name.equals("pomodoro")&&!name.equals("focus"))throw new Exception("未知记录集合");
  }
  private String manifest(String name){return "records."+name;}
  private String chunkKey(String name,long revision,int index){return "records."+name+"."+revision+"."+index;}

  private Snapshot read(String name) throws Exception {
    String raw=storage.read(manifest(name));
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
    storage.write(manifest(name),next+"\nchunks:"+count);
    // Old chunk keys are not referenced by the new manifest; cleanup is best effort.
    if(current.chunks>0)for(int i=0;i<current.chunks;i++){
      try{storage.delete(chunkKey(name,current.revision,i));}catch(Exception ignored){}
    }
    return new Snapshot(next,json,count);
  }
}
