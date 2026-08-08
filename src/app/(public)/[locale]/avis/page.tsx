"use client";

import { useState } from "react";
import { Star } from "lucide-react";

const mockReviews = [
  { id: 1, name: "Aminata D.", rating: 5, comment: "Service exceptionnel, équipe très professionnelle. Je recommande vivement !", date: "Mars 2025" },
  { id: 2, name: "Ibrahim K.", rating: 5, comment: "Mon Hadj a été une expérience spirituelle parfaite grâce à cette agence.", date: "Juin 2025" },
  { id: 3, name: "Fatoumata S.", rating: 5, comment: "Très bien organisé, accompagnement du début à la fin. Merci beaucoup !", date: "Janvier 2025" },
  { id: 4, name: "Moussa B.", rating: 4, comment: "Excellente agence, très réactive. La logistique était parfaite.", date: "Octobre 2024" },
  { id: 5, name: "Aïssatou N.", rating: 5, comment: "Je suis tellement reconnaissante. Mon rêve d'accomplir l'Oumra s'est réalisé grâce à vous.", date: "Avril 2025" },
  { id: 6, name: "Oumarou H.", rating: 5, comment: "Prix transparents, aucun frais caché. L'équipe est disponible 24h/24.", date: "Juillet 2025" },
];

export default function AvisPage() {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", rating: 5, comment: "" });
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitted(true);
    setShowForm(false);
  }

  const avg = (mockReviews.reduce((s, r) => s + r.rating, 0) / mockReviews.length).toFixed(1);

  return (
    <div className="py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Avis de nos pèlerins</h1>
          <div className="flex items-center justify-center gap-2 mb-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Star key={i} size={24} className="text-amber-400 fill-amber-400" />
            ))}
          </div>
          <p className="text-3xl font-bold text-gray-900">{avg}/5</p>
          <p className="text-gray-500">{mockReviews.length} avis vérifiés</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {mockReviews.map((review) => (
            <div key={review.id} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="font-semibold text-gray-900">{review.name}</p>
                <span className="text-xs text-gray-400">{review.date}</span>
              </div>
              <div className="flex gap-0.5 mb-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    size={14}
                    className={i < review.rating ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}
                  />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed">&ldquo;{review.comment}&rdquo;</p>
            </div>
          ))}
        </div>

        {/* Add review */}
        <div className="text-center">
          {submitted ? (
            <p className="text-[#0f5132] font-semibold">Merci pour votre avis ! Il sera publié après validation.</p>
          ) : showForm ? (
            <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm max-w-lg mx-auto text-left space-y-4">
              <h3 className="font-bold text-gray-900">Laisser un avis</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Votre nom</label>
                <input required type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((r) => (
                    <button key={r} type="button" onClick={() => setForm({ ...form, rating: r })}>
                      <Star size={24} className={r <= form.rating ? "text-amber-400 fill-amber-400" : "text-gray-300 fill-gray-300"} />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commentaire</label>
                <textarea required rows={4} value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none" />
              </div>
              <button type="submit" className="w-full bg-[#0f5132] text-white font-semibold py-2.5 rounded-lg hover:bg-[#0f5132] transition-colors">
                Soumettre mon avis
              </button>
            </form>
          ) : (
            <button onClick={() => setShowForm(true)} className="bg-[#0f5132] text-white font-semibold px-6 py-3 rounded-lg hover:bg-[#0f5132] transition-colors">
              Laisser un avis
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
