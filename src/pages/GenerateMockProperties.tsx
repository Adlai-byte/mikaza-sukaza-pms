import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { generateMockProperties } from "@/utils/generateMockProperties";
import { Loader2, Database } from "lucide-react";

export function GenerateMockProperties() {
  const [count, setCount] = useState(100);
  const [generating, setGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const results = await generateMockProperties(count);
      toast({
        title: "Success",
        description: `Successfully generated ${results.length} mock properties`,
      });
    } catch (error) {
      console.error('Error generating properties:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate properties",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="max-w-md mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Database className="h-5 w-5" />
              <span>Generate Mock Properties</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="count">Number of Properties</Label>
              <Input
                id="count"
                type="number"
                min="1"
                max="1000"
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value) || 100)}
                disabled={generating}
              />
            </div>
            
            <Button 
              onClick={handleGenerate} 
              disabled={generating || count < 1}
              className="w-full"
            >
              {generating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating Properties...
                </>
              ) : (
                `Generate ${count} Properties`
              )}
            </Button>
            
            <p className="text-sm text-muted-foreground">
              This will create {count} mock properties with random data including images, 
              locations, amenities, and all property details.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}