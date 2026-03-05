"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Medication {
  id: string;
  name: string;
  category: string;
  doseUnit: string;
}

interface MedEvent {
  id: string;
  dose: number;
  takenAt: string;
  notes: string | null;
  medication: { name: string; doseUnit: string };
}

export function MedsClient({
  initialMeds,
  initialEvents,
}: {
  initialMeds: Medication[];
  initialEvents: MedEvent[];
}) {
  const router = useRouter();
  const [meds, setMeds] = useState(initialMeds);
  const [events, setEvents] = useState(initialEvents);

  // New med form
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("supplement");
  const [newUnit, setNewUnit] = useState("mg");

  // Log dose form
  const [logMedId, setLogMedId] = useState("");
  const [logDose, setLogDose] = useState("");
  const [logTime, setLogTime] = useState(
    new Date().toISOString().slice(0, 16)
  );
  const [logNotes, setLogNotes] = useState("");

  async function addMed(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/meds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName,
        category: newCategory,
        doseUnit: newUnit,
      }),
    });
    if (res.ok) {
      const med = await res.json();
      setMeds([...meds, med].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewUnit("mg");
    }
  }

  async function deleteMed(id: string) {
    const res = await fetch(`/api/meds?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setMeds(meds.filter((m) => m.id !== id));
      setEvents(events.filter((e) => e.medication.name !== meds.find((m) => m.id === id)?.name));
    }
  }

  async function logDoseSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!logMedId || !logDose) return;
    const res = await fetch("/api/med-events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        medicationId: logMedId,
        dose: parseFloat(logDose),
        takenAt: new Date(logTime).toISOString(),
        notes: logNotes || null,
      }),
    });
    if (res.ok) {
      const event = await res.json();
      setEvents([event, ...events]);
      setLogDose("");
      setLogNotes("");
      setLogTime(new Date().toISOString().slice(0, 16));
    }
  }

  async function deleteEvent(id: string) {
    const res = await fetch(`/api/med-events?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      setEvents(events.filter((e) => e.id !== id));
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Medications</h1>

      {/* Add medication */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="font-semibold mb-3">Add Medication / Supplement</h2>
        <form onSubmit={addMed} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-48"
              placeholder="e.g. Magnesium"
              required
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Category
            </label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm"
            >
              <option value="supplement">Supplement</option>
              <option value="medication">Medication</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Dose Unit
            </label>
            <input
              type="text"
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm w-20"
              placeholder="mg"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 transition"
          >
            Add
          </button>
        </form>
      </div>

      {/* Medication list */}
      {meds.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold">Your Medications</h2>
          </div>
          <div className="divide-y divide-gray-100">
            {meds.map((m) => (
              <div
                key={m.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div>
                  <span className="font-medium">{m.name}</span>
                  <span className="text-xs text-gray-400 ml-2">
                    {m.category} · {m.doseUnit}
                  </span>
                </div>
                <button
                  onClick={() => deleteMed(m.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Log dose */}
      {meds.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 p-5">
          <h2 className="font-semibold mb-3">Log a Dose</h2>
          <form
            onSubmit={logDoseSubmit}
            className="flex flex-wrap gap-3 items-end"
          >
            <div>
              <label className="block text-xs text-gray-500 mb-1">
                Medication
              </label>
              <select
                value={logMedId}
                onChange={(e) => setLogMedId(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm"
                required
              >
                <option value="">Select...</option>
                {meds.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.doseUnit})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Dose</label>
              <input
                type="number"
                step="any"
                value={logDose}
                onChange={(e) => setLogDose(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-24"
                placeholder="400"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">When</label>
              <input
                type="datetime-local"
                value={logTime}
                onChange={(e) => setLogTime(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Notes</label>
              <input
                type="text"
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm w-40"
                placeholder="Optional notes"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-1.5 bg-black text-white text-sm rounded hover:bg-gray-800 transition"
            >
              Log
            </button>
          </form>
        </div>
      )}

      {/* Recent events */}
      {events.length > 0 && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h2 className="font-semibold">Recent Logs</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">
                    Medication
                  </th>
                  <th className="text-right px-4 py-2 font-medium text-gray-500">
                    Dose
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">
                    When
                  </th>
                  <th className="text-left px-4 py-2 font-medium text-gray-500">
                    Notes
                  </th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {events.map((ev) => (
                  <tr key={ev.id}>
                    <td className="px-4 py-2 font-medium">
                      {ev.medication.name}
                    </td>
                    <td className="px-4 py-2 text-right">
                      {ev.dose} {ev.medication.doseUnit}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {new Date(ev.takenAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs">
                      {ev.notes || "—"}
                    </td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => deleteEvent(ev.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
