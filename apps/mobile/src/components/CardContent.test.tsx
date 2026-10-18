import React from 'react';
import {Text, ScrollView} from 'react-native';
import {render,screen} from '@testing-library/react-native';
import {CardContent} from './CardContent';
test('fact content never creates a competing vertical scroll area', async()=>{
 await render(<CardContent><Text>Complete short fact</Text></CardContent>);
 expect(screen.getByText('Complete short fact')).toBeTruthy();
 expect(screen.getByTestId("card-content").props.onScroll).toBeUndefined();
});
