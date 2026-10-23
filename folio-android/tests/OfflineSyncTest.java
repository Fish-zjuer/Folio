package app.folio.preview;
import java.io.*;import java.util.*;
public final class OfflineSyncTest {
 static int checks=0;static void ok(boolean value){checks++;if(!value)throw new AssertionError("check "+checks);}
 public static void main(String[] args)throws Exception{
  final String account=String.join("",Collections.nCopies(64,"a")),tx="fixture-transaction-0001";String[] names={"study","pomodoro","focus","learning"};
  for(int failAt=1;failAt<=6;failAt++){
   final Map<String,String> disk=new HashMap<>();final int[] writes={0},failure={0};RecordRepository r=new RecordRepository(new RecordRepository.Storage(){public String read(String k){return disk.get(k);}public void write(String k,String v)throws Exception{if(++writes[0]==failure[0])throw new IOException("disk full");disk.put(k,v);}public void delete(String k){disk.remove(k);}});
   Map<String,Long> expected=new LinkedHashMap<>();Map<String,String> next=new LinkedHashMap<>();for(String name:names){r.save(name,0,"{\"version\":1,\"value\":\"old\"}");expected.put(name,1L);next.put(name,"{\"version\":1,\"value\":\"new\"}");}writes[0]=0;failure[0]=failAt;
   boolean failed=false;try{r.replace(expected,next,account,tx);}catch(Exception e){failed=true;}for(String name:names)ok(r.get(name).data.contains(failed?"old":"new"));
   if(!failed){failure[0]=0;ok(r.save("learning",2,"{\"version\":1,\"value\":\"changed\"}").revision==3);ok(r.get("study").data.contains("new"));try{r.replace(expected,next,account,tx);throw new AssertionError();}catch(Exception e){ok(e.getMessage().contains("冲突"));}}
  }
  File dir=new File(args[0]);OfflineTransfer transfer=new OfflineTransfer(dir);try{transfer.begin("../../secrets");throw new AssertionError();}catch(Exception e){ok(e.getMessage().contains("文件名"));}String token=transfer.begin("folio-sync-2026-10-22.folio");String encoded=Base64.getEncoder().encodeToString("encrypted fixture".getBytes("UTF-8"));ok(transfer.append(token,0,encoded)==17);try{transfer.append(token,0,encoded);throw new AssertionError();}catch(Exception e){ok(e.getMessage().contains("顺序"));}File file=transfer.finish(token);ok(file.length()==17);try{transfer.append(token,17,encoded);throw new AssertionError();}catch(Exception e){ok(e.getMessage().contains("顺序"));}transfer.clear(token);ok(!file.exists());
  String zipToken=transfer.begin("folio-relationships-2026-10-23.zip");byte[] payload=new byte[]{80,75,3,4,0,1,(byte)255};ok(transfer.append(zipToken,0,Base64.getEncoder().encodeToString(payload))==payload.length);File zip=transfer.finish(zipToken);ok(zip.length()==payload.length);try(FileInputStream input=new FileInputStream(zip)){byte[] actual=new byte[payload.length];ok(input.read(actual)==payload.length&&Arrays.equals(actual,payload));}transfer.clear(zipToken);ok(!zip.exists());
  try{transfer.begin("folio-relationships-../../x.zip");throw new AssertionError();}catch(Exception e){ok(e.getMessage().contains("文件名"));}
  System.out.println("PASS "+checks+" offline sync repository/transfer checks");
 }
}
