"use client";

import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';

interface Props {
  data: string;
  qrImageUrl?: string | null;
}

export default function QRCodeInline({ data, qrImageUrl }: Props) {
  const [dataUrl, setDataUrl] = useState<string>(qrImageUrl || '');
  const [error, setError] = useState(false);

  useEffect(() => {
    if (qrImageUrl) {
      setDataUrl(qrImageUrl);
      return;
    }
    if (!data) return;
    QRCodeLib.toDataURL(data, {
      width: 220,
      margin: 1,
      color: { dark: '#000', light: '#fff' },
    })
      .then((url) => setDataUrl(url))
      .catch(() => setError(true));
  }, [data, qrImageUrl]);

  if (error) {
    return (
      <div className="mx-auto rounded-lg bg-paper border border-border p-4 text-center text-sm text-muted">
        Gagal generate QR Code
      </div>
    );
  }

  if (!dataUrl) {
    return (
      <div className="mx-auto rounded-lg bg-paper border border-border p-4 text-center text-sm text-muted">
        Memuat QR Code...
      </div>
    );
  }

  return (
    <img
      src={dataUrl}
      alt="WhatsApp Bot QR Code"
      className="mx-auto rounded-lg shadow-md bg-white p-2"
      style={{ width: '200px', height: '200px' }}
    />
  );
}
