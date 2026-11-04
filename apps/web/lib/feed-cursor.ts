export class FeedCursorError extends Error {
 constructor(public code:'INVALID_CURSOR'|'REFRESH_REQUIRED'){super(code);}
}
export type FeedCursor={snapshotId:string;position:number};
function valid(value:any):value is FeedCursor {
 return !!value&&typeof value.snapshotId==='string'&&/^[a-zA-Z0-9_-]{1,96}$/.test(value.snapshotId)&&Number.isSafeInteger(value.position)&&value.position>=0;
}
export function encodeFeedCursor(value:FeedCursor):string {
 if(!valid(value)) throw new FeedCursorError('INVALID_CURSOR');
 return Buffer.from(JSON.stringify(value)).toString('base64url');
}
export function decodeFeedCursor(raw:string):FeedCursor {
 try {
  if(!raw||raw.length>512||!/^[A-Za-z0-9_-]+$/.test(raw))throw Error();
  const decoded=Buffer.from(raw,'base64url');
  if(decoded.toString('base64url')!==raw)throw Error();
  const value=JSON.parse(decoded.toString('utf8'));
  if(!valid(value))throw Error();
  return {snapshotId:value.snapshotId,position:value.position};
 }catch{throw new FeedCursorError('INVALID_CURSOR');}
}
