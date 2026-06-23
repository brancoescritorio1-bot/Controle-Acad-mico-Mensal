import React, { useRef } from 'react';
import { ChacaraBill, ChacaraUser } from '../types';

interface Props {
  bills: ChacaraBill[];
  users: ChacaraUser[];
  filterMonth: string;
}

export const ChacaraExtractPrintView = ({ bills, users, filterMonth }: Props) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  const calculateTotal = (bill: ChacaraBill) => {
    return bill.total || 0;
  };

  return (
    <div className="p-8 bg-white" id="print-area" ref={printAreaRef}>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Extrato de Pendências - Chácara</h1>
        <p className="text-sm">Mês: {filterMonth}</p>
        <button 
          onClick={handlePrint}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-indigo-700 no-print"
        >
          Imprimir / Salvar PDF
        </button>
      </div>
      
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2">Usuário</th>
            <th className="border p-2">Total</th>
            <th className="border p-2">Pago</th>
            <th className="border p-2">Pendente</th>
            <th className="border p-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {bills.map(bill => {
            const user = users.find(u => u.id === bill.chacara_user_id);
            const paid = bill.amount_paid || 0;
            const pending = (bill.total || 0) - paid;
            return (
              <tr key={bill.id}>
                <td className="border p-2">{user?.name || 'N/I'}</td>
                <td className="border p-2 text-right">R$ {(bill.total || 0).toFixed(2)}</td>
                <td className="border p-2 text-right">R$ {paid.toFixed(2)}</td>
                <td className="border p-2 text-right">R$ {pending.toFixed(2)}</td>
                <td className="border p-2 text-center">{bill.status === 'paid' ? 'PAGO' : 'PENDENTE'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
