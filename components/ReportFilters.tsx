import {statusLabels} from '@/lib/reporting';
export default function ReportFilters({values,buildings,categories}:{values:Record<string,string>;buildings:{id:number;name:string}[];categories:{id:number;name:string}[]}){
 const input='block mt-2 w-full rounded-lg border border-slate-300 bg-white p-2 text-sm';
 return <form action="/admin/dashboard" className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-3 lg:grid-cols-6">
 <label className="text-sm">วันที่แจ้งตั้งแต่<input className={input} type="date" name="from" defaultValue={values.from}/></label>
 <label className="text-sm">ถึงวันที่<input className={input} type="date" name="to" defaultValue={values.to}/></label>
 <label className="text-sm">สถานะ<select className={input} name="status" defaultValue={values.status}><option value="">ทั้งหมด</option>{Object.entries(statusLabels).map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></label>
 {(['buildingId','categoryId'] as const).map((key)=><label key={key} className="text-sm">{key==='buildingId'?'อาคาร':'หมวดหมู่'}<select className={input} name={key} defaultValue={values[key]}><option value="">ทั้งหมด</option>{(key==='buildingId'?buildings:categories).map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>)}
 <div className="flex items-end gap-3"><button className="rounded-lg bg-slate-900 p-3 text-sm text-white">แสดงผล</button><a href="/admin/dashboard" className="p-2 text-sm underline">ล้าง</a></div>
 </form>;
}
