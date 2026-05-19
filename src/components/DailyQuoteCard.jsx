// src/components/DailyQuoteCard.jsx
import { getDailyQuote } from '../data/dailyQuotes.js';

export default function DailyQuoteCard() {
  const quote = getDailyQuote();
  if (!quote) return null;

  return (
    <section className="card quote-card">
      <div className="card-title">Quote des Tages</div>
      <p className="quote-text">„{quote.text}“</p>
      <div className="sub">— {quote.author}</div>
    </section>
  );
}
