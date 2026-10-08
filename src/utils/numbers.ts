export const generate6DigitRandomNumber = () => {
  // Generate a unique case number for demonstration purposes. In a real application, this should be generated according to your organization's standards.
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');
  return (timestamp + random).slice(-6); // Ensure exactly 6 digits
};

export const generateMedicalRecordNumber = () => {
  // Generate a unique case number for demonstration purposes. In a real application, this should be generated according to your organization's standards.
  const timestamp = Date.now().toString().slice(-8); // Last 8 digits of timestamp
  const random = Math.floor(Math.random() * 100)
    .toString()
    .padStart(2, '0');
  return (timestamp + random).slice(-8); // Ensure exactly 8 digits
};
