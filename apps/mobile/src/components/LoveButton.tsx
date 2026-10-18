import React, {useEffect,useRef,useState} from 'react';
import {Animated,Pressable,View} from 'react-native';
import {Icon} from './Icon';
import {strings} from '../i18n';
import {useAppTheme} from '../theme';
const particles=Array.from({length:10},(_,i)=>({x:Math.cos(i*Math.PI/5)*42,y:Math.sin(i*Math.PI/5)*38-18,color:['#FF659B','#FFC875','#BFA2FF'][i%3]}));
export function LoveButton({loved,language,onPress}:{loved:boolean;language:'en'|'hi';onPress:()=>void}) {
 const theme=useAppTheme(); const s=strings(language);
 const progress=useRef(new Animated.Value(0)).current;
 const previous=useRef(loved); const [celebrating,setCelebrating]=useState(false);
 useEffect(()=>{
  const newlyLoved=loved && !previous.current; previous.current=loved;
  progress.stopAnimation(); progress.setValue(0); setCelebrating(false);
  if(!newlyLoved || theme.reduceMotion) return;
  setCelebrating(true);
  const animation=Animated.timing(progress,{toValue:1,duration:650,useNativeDriver:true});
  animation.start(({finished})=>{if(finished)setCelebrating(false);});
  return ()=>animation.stop();
 },[loved,theme.reduceMotion,progress]);
 return <Pressable accessibilityRole="button" accessibilityLabel={loved?s.unlove:s.love}
  accessibilityState={{selected:loved}} onPress={onPress}
  style={{minHeight:46,minWidth:52,borderRadius:16,alignItems:'center',justifyContent:'center',backgroundColor:loved?'#57263F':theme.tint}}>
  <Animated.View testID={loved?'love-heart-filled':'love-heart-outline'} style={{transform:[{scale:progress.interpolate({inputRange:[0,.25,1],outputRange:[1,1.3,1]})}]}}>
   <Icon name="heart" filled={loved} color={loved?'#FF76A7':theme.accent} size={26}/>
  </Animated.View>
  {celebrating && <View testID="love-sprinkles" pointerEvents="none" style={{position:'absolute',left:'50%',top:'50%'}}>
   {particles.map((p,i)=><Animated.View key={i} style={{position:'absolute',width:5,height:7,borderRadius:2,backgroundColor:p.color,
    opacity:progress.interpolate({inputRange:[0,.15,.8,1],outputRange:[0,1,1,0]}),transform:[{translateX:progress.interpolate({inputRange:[0,1],outputRange:[0,p.x]})},{translateY:progress.interpolate({inputRange:[0,1],outputRange:[0,p.y]})},{rotate:`${i*36}deg`}]}}/>)}</View>}
 </Pressable>;
}
