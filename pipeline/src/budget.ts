export function ingestBudgetMs(value:string|undefined):number {
 const minutes=Number(value??45);
 if(!Number.isInteger(minutes)||minutes<1||minutes>50) throw Error('Ingestion budget must be 1–50 whole minutes');
 return minutes*60_000;
}
