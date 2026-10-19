package app.folio.preview;

import java.util.*;

/** Union of unlocked, interactive foreground intervals. No per-app details leave the adapter. */
final class UsageTimeline {
  static final class Event {
    final long at;final int type;final String activity;
    Event(long at,int type,String activity){this.at=at;this.type=type;this.activity=activity==null?"":activity;}
  }
  static long[] totals(List<Event> source,long[] boundaries,long now) {
    long[] totals=new long[boundaries.length-1];List<Event> events=new ArrayList<>(source);events.sort(Comparator.comparingLong(e->e.at));
    Set<String> foreground=new HashSet<>();boolean interactive=false,unlocked=false,screenKnown=false,lockKnown=false;long previous=events.isEmpty()?now:events.get(0).at;
    for(Event e:events){if(e.at>now)break;if(interactive&&unlocked&&!foreground.isEmpty())add(totals,boundaries,previous,e.at);previous=e.at;
      switch(e.type){
        case 1:foreground.add(e.activity);if(!screenKnown)interactive=true;if(!lockKnown)unlocked=true;break;
        case 2:case 23:foreground.remove(e.activity);break;
        case 15:interactive=true;screenKnown=true;break;
        case 16:interactive=false;screenKnown=true;break;
        case 17:unlocked=false;lockKnown=true;break;
        case 18:unlocked=true;lockKnown=true;break;
        case 26:foreground.clear();interactive=false;screenKnown=true;break;
      }
    }
    if(interactive&&unlocked&&!foreground.isEmpty())add(totals,boundaries,previous,now);
    return totals;
  }
  private static void add(long[] out,long[] bounds,long start,long end){for(int i=0;i<out.length;i++)out[i]+=Math.max(0,Math.min(end,bounds[i+1])-Math.max(start,bounds[i]));}
}
