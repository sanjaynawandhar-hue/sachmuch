import {it,expect} from 'vitest';
import {ingestBudgetMs} from '../src/budget';
it('allows the existing schedule but rejects budgets that overrun the runner',()=>{
 expect(ingestBudgetMs(undefined)).toBe(2700000);
 expect(ingestBudgetMs('1')).toBe(60000);
 for(const value of ['0','-1','NaN','Infinity','60','1000','1.5','']) expect(()=>ingestBudgetMs(value)).toThrow();
});
