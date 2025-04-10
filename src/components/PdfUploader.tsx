
// Import the pdf-utils module
import { extractTextFromPdf } from "@/lib/pdf-utils";

// Update the addRecording call to include createdAt
const handleProcessPdf = async (file: File) => {
  try {
    setIsProcessing(true);
    
    // Extract text from PDF
    const extractedText = await extractTextFromPdf(file);
    
    // Generate audio URL
    const audioBlob = new Blob([], { type: 'audio/mp3' });
    const audioUrl = URL.createObjectURL(audioBlob);
    
    // Add recording
    addRecording({
      name: file.name.replace('.pdf', ''),
      audioUrl: audioUrl,
      audioData: audioUrl,
      output: extractedText,
      folderId: selectedFolder,
      duration: 0,
      suggestedEvents: [],
      createdAt: new Date().toISOString()
    });
    
    setIsProcessing(false);
    setShowPdfDialog(false);
    toast.success('PDF procesado correctamente');
    
  } catch (error) {
    console.error('Error processing PDF:', error);
    setIsProcessing(false);
    toast.error('Error al procesar el PDF');
  }
};
