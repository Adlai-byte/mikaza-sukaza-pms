import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  signatureName: string;
  onNameChange: (name: string) => void;
  disabled?: boolean;
  initialSignature?: string | null;
  viewMode?: boolean;
}

export function SignaturePad({ onSave, signatureName, onNameChange, disabled = false, initialSignature = null, viewMode = false }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const [currentSignature, setCurrentSignature] = useState<string | null>(initialSignature);

  // Update currentSignature when initialSignature changes (e.g., when loading a different record)
  useEffect(() => {
    setCurrentSignature(initialSignature);
  }, [initialSignature]);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
    setCurrentSignature(null);
    onSave(''); // Clear the signature in parent component
  };

  const save = () => {
    if (sigCanvas.current && !isEmpty) {
      const signatureData = sigCanvas.current.toDataURL('image/png');
      onSave(signatureData);
    }
  };

  const handleEnd = () => {
    setIsEmpty(sigCanvas.current?.isEmpty() || false);
    // Auto-save when signature is drawn
    if (!isEmpty && sigCanvas.current) {
      const signatureData = sigCanvas.current.toDataURL('image/png');
      onSave(signatureData);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Signature</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Name input */}
        <div>
          <label htmlFor="signature-name" className="text-sm font-medium">
            Full Name
          </label>
          <input
            id="signature-name"
            type="text"
            value={signatureName}
            onChange={(e) => onNameChange(e.target.value)}
            disabled={disabled}
            placeholder="Enter full name"
            className="mt-1 w-full px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
          />
        </div>

        {/* Signature display or canvas */}
        {currentSignature ? (
          <div className="space-y-2">
            <label className="text-sm font-medium">Signature</label>
            <div className="border border-input rounded-md bg-white p-4">
              <img
                src={currentSignature}
                alt="Signature"
                className="w-full h-40 object-contain"
              />
            </div>
            {!viewMode && (
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={clear}
                  disabled={disabled}
                >
                  <Eraser className="h-4 w-4 mr-2" />
                  Clear & Redraw
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium">Draw Signature</label>
            <div className="border border-input rounded-md bg-white">
              <SignatureCanvas
                ref={sigCanvas}
                canvasProps={{
                  className: 'w-full h-40 cursor-crosshair',
                  style: { touchAction: 'none' }
                }}
                onEnd={handleEnd}
                disabled={disabled}
              />
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clear}
                disabled={disabled || isEmpty}
              >
                <Eraser className="h-4 w-4 mr-2" />
                Clear
              </Button>
            </div>
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          {currentSignature
            ? viewMode
              ? 'Signature on record'
              : 'Click "Clear & Redraw" to create a new signature'
            : 'Draw your signature in the box above. The signature will be saved automatically.'}
        </p>
      </CardContent>
    </Card>
  );
}
