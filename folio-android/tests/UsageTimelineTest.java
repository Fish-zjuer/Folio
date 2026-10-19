package app.folio.preview;
import java.util.*;

public final class UsageTimelineTest {
  static int checks=0;
  static UsageTimeline.Event e(long at,int type,String who){return new UsageTimeline.Event(at,type,who);}
  static void check(long[] expected,long[] actual){if(!Arrays.equals(expected,actual))throw new AssertionError(Arrays.toString(actual)+" != "+Arrays.toString(expected));checks++;}
  public static void main(String[] args){
    check(new long[]{10},UsageTimeline.totals(Arrays.asList(e(0,1,"a"),e(10,2,"a")),new long[]{0,20},20));
    check(new long[]{10},UsageTimeline.totals(Arrays.asList(e(0,1,"a"),e(3,1,"b"),e(5,2,"a"),e(10,2,"b")),new long[]{0,20},20));
    check(new long[]{7},UsageTimeline.totals(Arrays.asList(e(0,1,"a"),e(5,16,""),e(15,15,""),e(15,17,""),e(18,18,"")),new long[]{0,20},20));
    check(new long[]{5,5},UsageTimeline.totals(Arrays.asList(e(5,1,"a"),e(15,2,"a")),new long[]{0,10,20},20));
    check(new long[]{7},UsageTimeline.totals(Arrays.asList(e(0,1,"a"),e(20,2,"a")),new long[]{0,30},7));
    check(new long[]{5},UsageTimeline.totals(Arrays.asList(e(0,1,"a"),e(5,26,"")),new long[]{0,20},20));
    check(new long[]{0},UsageTimeline.totals(Collections.emptyList(),new long[]{0,20},20));
    check(new long[]{5},UsageTimeline.totals(Arrays.asList(e(-5,1,"a"),e(5,2,"a")),new long[]{0,20},20));
    check(new long[]{0},UsageTimeline.totals(Arrays.asList(e(0,17,""),e(1,1,"a")),new long[]{0,20},20));
    System.out.println("PASS "+checks+" offline phone usage checks");
  }
}
