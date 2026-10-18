import React from 'react';
import {View} from 'react-native';
/** The pager owns the only scroll gesture. Facts are edited to fit this card. */
export function CardContent({children,compact=false}:{children:React.ReactNode;compact?:boolean}) {
 return <View testID="card-content" style={{flex:1,padding:compact?14:22,gap:compact?8:14,justifyContent:'center'}}>{children}</View>;
}
