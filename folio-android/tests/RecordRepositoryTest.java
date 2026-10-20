package app.folio.preview;
import java.util.*;
public final class RecordRepositoryTest {
  static void ok(boolean value){if(!value)throw new AssertionError();}
  public static void main(String[] args)throws Exception{
    final Map<String,String> disk=new HashMap<>();final boolean[] fail={false};RecordRepository r=new RecordRepository(new RecordRepository.Storage(){public String read(String k){return disk.get(k);}public void write(String k,String v)throws Exception{if(fail[0])throw new Exception("disk full");disk.put(k,v);}public void delete(String k){disk.remove(k);}});
    ok(r.get("study").revision==0);ok(r.save("study",0,"{\"version\":1}").revision==1);
    try{r.save("study",0,"{}");throw new AssertionError();}catch(Exception e){ok(e.getMessage().contains("冲突"));}
    fail[0]=true;try{r.save("study",1,"{}");throw new AssertionError();}catch(Exception e){ok(r.get("study").revision==1);}fail[0]=false;
    ok(r.save("study",1,"{\"version\":1,\"value\":2}").revision==2);ok(r.get("focus").revision==0);
    try{r.get("provider");throw new AssertionError();}catch(Exception e){ok(e.getMessage().contains("未知"));}
    disk.put("records.study","broken");try{r.get("study");throw new AssertionError();}catch(Exception e){ok(e.getMessage().contains("损坏"));}
    disk.clear();
    StringBuilder big=new StringBuilder("{\"version\":1,\"data\":\"");
    while(big.length()<900000)big.append("学习记录");
    big.append("\"}");
    RecordRepository.Snapshot saved=r.save("study",0,big.toString());
    ok(saved.revision==1);ok(saved.chunks>1);ok(r.get("study").data.equals(big.toString()));
    ok(!disk.containsKey("records.study")||disk.get("records.study").contains("chunks:"));
    System.out.println("PASS 9 record repository checks");
  }
}
