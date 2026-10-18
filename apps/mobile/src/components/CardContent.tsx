import React, {useRef, useState} from 'react';
import {ScrollView} from 'react-native';
/** Short cards pass gestures to the pager. Overflow can be read in place;
 * a fresh swipe begun at either boundary continues to the adjacent fact. */
export function CardContent({children,onBoundary}:{children:React.ReactNode;onBoundary:(delta:number)=>void}) {
 const [viewport,setViewport]=useState(0);
 const [content,setContent]=useState(0);
 const offset=useRef(0);
 const start=useRef<{y:number;offset:number}|null>(null);
 const overflow=viewport>0 && content>viewport+2;
 return <ScrollView testID="card-content" style={{flex:1}}
  contentContainerStyle={{padding:22,gap:14,flexGrow:1}}
  scrollEnabled={overflow} bounces={false} scrollEventThrottle={16}
  onLayout={e=>setViewport(e.nativeEvent.layout.height)}
  onContentSizeChange={(_,height)=>setContent(height)}
  onScroll={e=>{offset.current=e.nativeEvent.contentOffset.y;}}
  onTouchStart={e=>{start.current={y:e.nativeEvent.pageY,offset:offset.current};}}
  onTouchCancel={()=>{start.current=null;}}
  onTouchEnd={e=>{
   const began=start.current; start.current=null;
   if(!overflow || !began) return;
   const delta=e.nativeEvent.pageY-began.y;
   if(delta < -55 && began.offset>=content-viewport-2) onBoundary(1);
   else if(delta > 55 && began.offset<=2) onBoundary(-1);
  }}>{children}</ScrollView>;
}
