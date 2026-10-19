package app.folio.preview;

import android.content.ContentProvider;
import android.content.ContentValues;
import android.database.Cursor;
import android.database.MatrixCursor;
import android.net.Uri;
import android.os.ParcelFileDescriptor;
import android.provider.OpenableColumns;
import java.io.File;
import java.io.FileNotFoundException;

public final class CaptureProvider extends ContentProvider {
  public boolean onCreate(){return true;}
  private File file(Uri uri) throws FileNotFoundException {
    String name=uri.getLastPathSegment();
    if(name==null||!name.matches("capture-[a-zA-Z0-9-]+\\.jpg"))throw new FileNotFoundException();
    return new File(getContext().getCacheDir(),name);
  }
  public ParcelFileDescriptor openFile(Uri uri,String mode) throws FileNotFoundException {return ParcelFileDescriptor.open(file(uri),ParcelFileDescriptor.parseMode(mode));}
  public String getType(Uri uri){return "image/jpeg";}
  public Cursor query(Uri uri,String[] projection,String selection,String[] selectionArgs,String sort){
    try{File f=file(uri);MatrixCursor c=new MatrixCursor(new String[]{OpenableColumns.DISPLAY_NAME,OpenableColumns.SIZE});c.addRow(new Object[]{f.getName(),f.length()});return c;}catch(Exception e){return null;}
  }
  public Uri insert(Uri uri,ContentValues values){throw new UnsupportedOperationException();}
  public int delete(Uri uri,String selection,String[] args){return 0;}
  public int update(Uri uri,ContentValues values,String selection,String[] args){return 0;}
}
