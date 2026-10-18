import React from 'react';
import {render,screen,fireEvent} from '@testing-library/react-native';
import {LoveButton} from './LoveButton';
import {Icon} from './Icon';
jest.mock('../theme',()=>({useAppTheme:()=>({accent:'#7050a0',tint:'#eee',reduceMotion:false})}));
test('a confirmed love fills the heart and celebrates; unlike clears it', async()=>{
 const onPress=jest.fn();
 const view=await render(<LoveButton loved={false} language="en" onPress={onPress}/>);
 await fireEvent.press(screen.getByRole('button',{name:'Love fact'}));
 expect(onPress).toHaveBeenCalledTimes(1);
 await view.rerender(<LoveButton loved language="en" onPress={onPress}/>);
 expect(screen.getByRole('button',{name:'Unlike fact'}).props.accessibilityState.selected).toBe(true);
 expect(screen.getByTestId("love-heart-filled")).toBeTruthy();
 expect(screen.getByTestId('love-sprinkles')).toBeTruthy();
 await view.rerender(<LoveButton loved={false} language="en" onPress={onPress}/>);
 expect(screen.queryByTestId("love-heart-filled")).toBeNull();
});
