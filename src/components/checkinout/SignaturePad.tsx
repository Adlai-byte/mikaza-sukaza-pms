import React, { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onSave: (signatureData: string) => void;
  signatureName: string;
  onNameChange: (name: string) => void;
  disabled?: boolean;
}

export function SignaturePad({ onSave, signatureName, onNameChange, disabled = false }: SignaturePadProps) {
  const sigCanvas = useRef<SignatureCanvas>(null);
  const [isEmpty, setIsEmpty] = useState(true);

  const clear = () => {
    sigCanvas.current?.clear();
    setIsEmpty(true);
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

        {/* Signature canvas */}
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

        <p className="text-xs text-muted-foreground">
          Draw your signature in the box above. The signature will be saved automatically.
        </p>
      </CardContent>
    </Card>
  );
}
