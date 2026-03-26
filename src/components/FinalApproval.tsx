import { useState } from 'react';

interface Props {
  jobId: string;
  job: any;
  onApprove: () => void;
}

export default function FinalApproval({ jobId, job, onApprove }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const isApproved = (job as any).approvedFinal;

  return (
    <div className="bg-dark-card border border-dark-border-light rounded-2xl overflow-hidden">
      <div
        className={`p-6 text-center ${
          isApproved
            ? 'bg-green-500/10 border-t-2 border-green-500'
            : ''
        }`}
      >
        {isApproved ? (
          <>
            <div className="text-3xl mb-2">✅</div>
            <div className="font-bold text-lg text-white">הסרטון אושר סופית</div>
            <div className="text-sm text-gray-500 mt-1">
              הקבצים הזמניים נמחקו. ההורדה תמיד זמינה.
            </div>
          </>
        ) : (
          <>
            <div className="text-lg font-bold text-white mb-3">
              מרוצה מהתוצאה? אשר סופית או בקש תיקונים למעלה
            </div>
            <div className="text-sm text-gray-500 mb-4">
              אישור סופי ימחק את החומרים הזמניים. לאחר אישור לא ניתן לבקש תיקונים.
            </div>
            <button
              onClick={() => {
                if (!confirmed) {
                  setConfirmed(true);
                  return;
                }
                fetch(`/api/jobs/${jobId}/approve-final`, { method: 'POST' })
                  .then(() => onApprove());
              }}
              className={`px-9 py-3 text-base font-bold text-white border-none rounded-xl cursor-pointer transition-all ${
                confirmed
                  ? 'bg-green-600 hover:bg-green-500'
                  : 'gradient-purple hover:opacity-90'
              }`}
            >
              {confirmed ? 'לחץ שוב לאישור סופי' : 'אשר עריכה סופית'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
