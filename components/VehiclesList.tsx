import React, { useMemo } from 'react';
import { getVehicleStats } from '../services/dataService';
import { Truck, MapPin, BarChart2 } from 'lucide-react';

const VehiclesList: React.FC = () => {
  const vehicles = useMemo(() => getVehicleStats(), []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
       <div className="flex flex-col space-y-1">
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Veículos</h2>
        <p className="text-slate-500 text-sm">Status da frota e performance por unidade.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vehicles.map((vehicle, idx) => (
          <div key={idx} className="relative bg-white border border-slate-200 rounded-xl overflow-hidden hover:shadow-md transition-all group">
            {/* Visual Header */}
            <div className="h-20 bg-slate-50 relative p-5 border-b border-slate-100">
               <Truck className="text-slate-200 absolute right-4 top-2 opacity-50 transform scale-150 rotate-[-10deg]" size={64} />
               <div className="relative z-10">
                 <h3 className="text-xl font-bold text-slate-800 tracking-wider">{vehicle.id}</h3>
               </div>
            </div>

            <div className="p-5">
               <div className="flex items-center text-slate-500 mb-6 text-sm">
                 <MapPin size={16} className="mr-2 text-[#00ad74]" />
                 <span className="font-medium">{vehicle.base}</span>
               </div>

               <div className="grid grid-cols-2 gap-4">
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                   <div className="text-[10px] text-slate-400 mb-1 flex items-center gap-1 font-bold uppercase">
                     <BarChart2 size={12} /> Avaliações
                   </div>
                   <div className="text-lg font-bold text-slate-800">{vehicle.totalEvaluations}</div>
                 </div>
                 
                 <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                    <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase">Nota Média</div>
                    <div className={`text-lg font-bold ${vehicle.averageScore > 80 ? 'text-[#00ad74]' : 'text-[#ffa000]'}`}>
                      {vehicle.averageScore.toFixed(1)}%
                    </div>
                 </div>
               </div>
            </div>
            
            <div className="h-1 w-full bg-slate-100">
               <div 
                 className="h-full bg-[#00ad74] transition-all duration-1000" 
                 style={{ width: `${vehicle.averageScore}%` }}
               />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VehiclesList;