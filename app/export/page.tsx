'use client';
import { useState } from 'react';
import { Download, FileText, Table2, AlertCircle, CheckCircle } from 'lucide-react';

export default function ExportPage() {
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [month, setMonth] = useState('');
  const [tripType, setTripType] = useState('business');
  const [format, setFormat] = useState<'csv' | 'pdf'>('csv');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => String(new Date().getFullYear() - i));
  const monthNames = ['','Januari','Februari','Mars','April','Maj','Juni','Juli','Augusti','September','Oktober','November','December'];

  const handleExport = async () => {
    setLoading(true);
    setDone(false);

    const params = new URLSearchParams({ year, type: tripType, format });
    if (month) params.set('month', month);

    if (format === 'csv') {
      // Direct file download
      const url = `/api/export?${params}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `korjournal_${year}${month ? '_' + month.padStart(2,'0') : ''}.csv`;
      a.click();
      setDone(true);
    } else {
      // PDF: fetch data then generate client-side
      const res = await fetch(`/api/export?${params}&format=json`);
      const data = await res.json();
      await generatePDF(data);
      setDone(true);
    }

    setLoading(false);
  };

  return (
    <div className="p-4 space-y-4">
      <div className="pt-2">
        <h1 className="text-xl font-bold text-gray-900">Exportera körjournal</h1>
        <p className="text-sm text-gray-500 mt-1">Skatteverket-kompatibelt format</p>
      </div>

      <div className="card space-y-4">
        <div>
          <label className="label">År</label>
          <select className="input" value={year} onChange={e => setYear(e.target.value)}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <div>
          <label className="label">Månad (valfritt)</label>
          <select className="input" value={month} onChange={e => setMonth(e.target.value)}>
            <option value="">Hela året</option>
            {monthNames.slice(1).map((m, i) => (
              <option key={i+1} value={String(i+1)}>{m}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label">Restyp</label>
          <select className="input" value={tripType} onChange={e => setTripType(e.target.value)}>
            <option value="business">Tjänsteresor</option>
            <option value="private">Privata resor</option>
          </select>
        </div>

        <div>
          <label className="label">Format</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setFormat('csv')}
              className={`rounded-lg border-2 py-3 flex flex-col items-center gap-1 transition-colors ${
                format === 'csv' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
              }`}
            >
              <Table2 size={20} />
              <span className="text-sm font-medium">Excel/CSV</span>
              <span className="text-xs opacity-70">Öppnas i Excel</span>
            </button>
            <button
              onClick={() => setFormat('pdf')}
              className={`rounded-lg border-2 py-3 flex flex-col items-center gap-1 transition-colors ${
                format === 'pdf' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600'
              }`}
            >
              <FileText size={20} />
              <span className="text-sm font-medium">PDF</span>
              <span className="text-xs opacity-70">Redo att skriva ut</span>
            </button>
          </div>
        </div>
      </div>

      {/* Info box */}
      <div className="card bg-amber-50 border-amber-100 space-y-1">
        <div className="flex items-center gap-2 text-amber-800 font-semibold text-sm">
          <AlertCircle size={16} />
          Skatteverkets krav
        </div>
        <ul className="text-xs text-amber-700 space-y-0.5 ml-5 list-disc">
          <li>Exportfilen innehåller: datum, förare, fordon, reg.nr, ärende, start/mål, km, mätarställning</li>
          <li>Spara filen och bifoga vid deklaration eller på begäran av Skatteverket</li>
          <li>Originaldata sparas i appen och kan alltid exporteras om</li>
        </ul>
      </div>

      <button
        onClick={handleExport}
        disabled={loading}
        className="btn-primary w-full py-3 text-base"
      >
        {loading ? (
          <><span className="animate-spin">⟳</span> Genererar…</>
        ) : (
          <><Download size={20} /> Exportera {format.toUpperCase()}</>
        )}
      </button>

      {done && (
        <div className="flex items-center gap-2 text-green-600 bg-green-50 rounded-lg p-3 text-sm">
          <CheckCircle size={18} />
          Exporten är klar! Filen har laddats ned.
        </div>
      )}
    </div>
  );
}

// Client-side PDF generation using jsPDF
async function generatePDF(data: {
  trips: Record<string, unknown>[];
  settings: Record<string, string>;
  year: string;
  month: string | null;
}) {
  const { default: jsPDF } = await import('jspdf');
  const { default: autoTable } = await import('jspdf-autotable');

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  const driver = data.settings.driver_name || 'Okänd förare';
  const title = `Körjournal ${data.year}${data.month ? ' – månad ' + data.month : ''}`;

  doc.setFontSize(16);
  doc.text(title, 14, 15);
  doc.setFontSize(10);
  doc.text(`Förare: ${driver}`, 14, 22);
  doc.text(`Genererad: ${new Date().toLocaleDateString('sv-SE')}`, 14, 27);

  const rows = data.trips.map((t) => [
    String(t.date ?? ''),
    String(t.driver ?? driver),
    String(t.vehicle_name ?? ''),
    String(t.registration ?? ''),
    String(t.purpose ?? ''),
    String(t.start_address ?? ''),
    String(t.end_address ?? ''),
    t.start_odometer != null ? String(t.start_odometer) : '',
    t.end_odometer != null ? String(t.end_odometer) : '',
    t.distance_km != null ? Number(t.distance_km).toFixed(1) : '',
  ]);

  const totalKm = data.trips.reduce((s, t) => s + (Number(t.distance_km) || 0), 0);

  autoTable(doc, {
    startY: 32,
    head: [[
      'Datum', 'Förare', 'Fordon', 'Reg.nr', 'Ärende',
      'Från', 'Till', 'Mätare start', 'Mätare slut', 'km'
    ]],
    body: [
      ...rows,
      [{ content: `Totalt: ${totalKm.toFixed(1)} km`, colSpan: 10, styles: { fontStyle: 'bold', halign: 'right' } }]
    ],
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [37, 99, 235] },
    alternateRowStyles: { fillColor: [249, 250, 251] },
  });

  const monthPart = data.month ? `_${String(data.month).padStart(2,'0')}` : '';
  doc.save(`korjournal_${data.year}${monthPart}.pdf`);
}
