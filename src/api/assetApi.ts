export const getAssetByQR = async (qr: string) => {
  return await fetch(`/api/assets/qr/${qr}`).then(res => res.json());
};

export const getSections = async () => {
  return await fetch(`/api/sections`).then(res => res.json());
};

export const updateAssetSection = async (id: string, newSectionName: string) => {
  return await fetch(`/api/assets/${id}/location`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newSectionName })
  }).then(res => res.json());
};
