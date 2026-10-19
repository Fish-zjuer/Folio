package app.folio.preview;

import org.json.JSONObject;
import java.net.URLEncoder;
import java.util.Collections;

/** Public, fixed-host APIs. Account cookies and model credentials are never attached. */
final class PublicData {
  static String address(JSONObject input) throws Exception {
    switch(input.optString("kind")) {
      case "weather":
        double latitude=input.optDouble("latitude",Double.NaN),longitude=input.optDouble("longitude",Double.NaN);
        if(!Double.isFinite(latitude)||Math.abs(latitude)>90||!Double.isFinite(longitude)||Math.abs(longitude)>180)throw new Exception("城市坐标无效");
        return "https://api.open-meteo.com/v1/forecast?latitude="+latitude+"&longitude="+longitude+"&current=temperature_2m,apparent_temperature,relative_humidity_2m,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=Asia%2FShanghai";
      case "cities":
        String query=input.optString("query").trim();if(query.isEmpty()||query.length()>80)throw new Exception("请输入城市名称");
        return "https://geocoding-api.open-meteo.com/v1/search?name="+URLEncoder.encode(query,"UTF-8")+"&count=8&language=zh&format=json";
      case "news-list":return "https://hacker-news.firebaseio.com/v0/topstories.json";
      case "news-item":
        long item=input.optLong("id",0);if(item<=0||item>9007199254740991L)throw new Exception("资讯编号无效");
        return "https://hacker-news.firebaseio.com/v0/item/"+item+".json";
      default:throw new Exception("未知公开数据服务");
    }
  }
  static JSONObject fetch(Network network,String id,JSONObject input) throws Exception {
    JSONObject response=network.request(id,address(input),"GET",null,Collections.singletonMap("Accept","application/json"),false);
    int status=response.optInt("status");if(status!=200)throw new Exception("公开数据请求失败（"+status+"）");
    return new JSONObject().put("value",new org.json.JSONTokener(response.getString("body")).nextValue());
  }
}
