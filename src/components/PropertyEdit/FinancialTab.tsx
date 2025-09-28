import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Plus, Edit, Trash2, Download, DollarSign, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MikasaSpinner } from '@/components/ui/mikasa-loader';

interface FinancialEntry {
  entry_id: string;
  entry_date: string;
  description: string;
  credit: number;
  debit: number;
  balance: number;
  scheduled_balance: number;
  entry_type: string;
}

interface FinancialTabProps {
  propertyId: string;
}

export function FinancialTab({ propertyId }: FinancialTabProps) {
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState('9/2025');
  const [editingEntry, setEditingEntry] = useState<FinancialEntry | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const emptyEntry = {
    entry_date: '',
    description: '',
    credit: 0,
    debit: 0,
    balance: 0,
    scheduled_balance: 0,
    entry_type: 'debit',
  };

  const [formData, setFormData] = useState(emptyEntry);

  useEffect(() => {
    fetchEntries();
  }, [propertyId, selectedMonth]);

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('property_financial_entries')
        .select('*')
        .eq('property_id', propertyId)
        .order('entry_date', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching financial entries:', error);
      toast({
        title: "Error",
        description: "Failed to load financial entries",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (editingEntry) {
        // Update existing entry
        const { error } = await supabase
          .from('property_financial_entries')
          .update(formData)
          .eq('entry_id', editingEntry.entry_id);

        if (error) throw error;
        
        setEntries(prev => prev.map(e => 
          e.entry_id === editingEntry.entry_id 
            ? { ...e, ...formData }
            : e
        ));
        
        toast({
          title: "Success",
          description: "Entry updated successfully",
        });
      } else {
        // Create new entry
        const { data, error } = await supabase
          .from('property_financial_entries')
          .insert({
            ...formData,
            property_id: propertyId,
          })
          .select()
          .single();

        if (error) throw error;
        
        setEntries(prev => [...prev, data]);
        
        toast({
          title: "Success",
          description: "Entry added successfully",
        });
      }

      resetForm();
    } catch (error) {
      console.error('Error saving entry:', error);
      toast({
        title: "Error",
        description: "Failed to save entry",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (entryId: string) => {
    try {
      const { error } = await supabase
        .from('property_financial_entries')
        .delete()
        .eq('entry_id', entryId);

      if (error) throw error;
      
      setEntries(prev => prev.filter(e => e.entry_id !== entryId));
      
      toast({
        title: "Success",
        description: "Entry deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting entry:', error);
      toast({
        title: "Error",
        description: "Failed to delete entry",
        variant: "destructive",
      });
    }
  };

  const startEdit = (entry: FinancialEntry) => {
    setEditingEntry(entry);
    setFormData({
      entry_date: entry.entry_date,
      description: entry.description,
      credit: entry.credit,
      debit: entry.debit,
      balance: entry.balance,
      scheduled_balance: entry.scheduled_balance,
      entry_type: entry.entry_type,
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData(emptyEntry);
    setEditingEntry(null);
    setShowForm(false);
  };

  const handleInputChange = (field: keyof typeof formData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const loadMonth = () => {
    // In a real implementation, this would filter entries by month
    toast({
      title: "Loading",
      description: `Loading entries for ${selectedMonth}`,
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <MikasaSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Header */}
      <div className="bg-gradient-secondary rounded-xl p-6 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">Financial Entries</h2>
            <p className="text-white/80">Manage property income and expenses</p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2">
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="w-48 bg-white/90 border-0 text-foreground"
              />
            </div>
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-white text-primary hover:bg-white/90 font-medium shadow-lg"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Entry
            </Button>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-6">
        <Button className="bg-accent hover:bg-accent-hover text-accent-foreground shadow-lg">
          Create
        </Button>
        <Button variant="destructive" className="shadow-lg">
          Debit
        </Button>
        <Button className="bg-primary hover:bg-primary-hover text-primary-foreground shadow-lg">
          Owner Payment
        </Button>
        <Button className="bg-gradient-secondary text-white hover:opacity-90 shadow-lg">
          March Entry
        </Button>
      </div>

      {/* Enhanced Add/Edit Entry Form */}
      {showForm && (
        <Card className="mb-6 border-0 shadow-card bg-card/60 backdrop-blur-sm">
          <CardHeader className="bg-gradient-primary text-white rounded-t-lg">
            <CardTitle className="flex items-center text-lg">
              <DollarSign className="mr-2 h-5 w-5" />
              {editingEntry ? 'Edit Entry' : 'Add New Entry'}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="entry_date" className="text-sm font-medium text-foreground">Date</Label>
                <Input
                  id="entry_date"
                  type="date"
                  value={formData.entry_date}
                  onChange={(e) => handleInputChange('entry_date', e.target.value)}
                  className="mt-1"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description" className="text-sm font-medium text-foreground">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Entry description"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="entry_type" className="text-sm font-medium text-foreground">Type</Label>
                <Select value={formData.entry_type} onValueChange={(value) => handleInputChange('entry_type', value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="expense">Expense</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
              <div className="space-y-2">
                <Label htmlFor="credit" className="text-sm font-medium text-accent">Credit (+)</Label>
                <Input
                  id="credit"
                  type="number"
                  step="0.01"
                  value={formData.credit}
                  onChange={(e) => handleInputChange('credit', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-accent/20 focus:border-accent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="debit" className="text-sm font-medium text-destructive">Debit (-)</Label>
                <Input
                  id="debit"
                  type="number"
                  step="0.01"
                  value={formData.debit}
                  onChange={(e) => handleInputChange('debit', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="border-destructive/20 focus:border-destructive"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-foreground">Current Balance</Label>
                <div className="relative">
                  <Input 
                    value={`$${entries.length > 0 ? entries[0]?.balance?.toFixed(2) || '0.00' : '0.00'}`} 
                    disabled 
                    className="bg-primary/5 font-medium"
                  />
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 mt-8 pt-4 border-t">
              <Button variant="outline" onClick={resetForm} className="px-6">
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={!formData.description}
                className="bg-primary hover:bg-primary-hover text-primary-foreground px-6 shadow-primary"
              >
                {editingEntry ? 'Update Entry' : 'Add Entry'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Financial Entries Table */}
      <Card className="border-0 shadow-card bg-card/60 backdrop-blur-sm">
        <CardHeader className="bg-gradient-subtle border-b">
          <CardTitle className="flex items-center text-lg">
            <TrendingUp className="mr-2 h-5 w-5 text-primary" />
            Financial Records
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead className="font-semibold">Date</TableHead>
                <TableHead className="font-semibold">Description</TableHead>
                <TableHead className="text-right font-semibold">Credit</TableHead>
                <TableHead className="text-right font-semibold">Debit</TableHead>
                <TableHead className="text-right font-semibold">Balance</TableHead>
                <TableHead className="text-right font-semibold">Scheduled Balance</TableHead>
                <TableHead className="w-[120px] text-center font-semibold">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Initial Balance Row */}
              <TableRow className="bg-background">
                <TableCell className="font-medium text-muted-foreground">-</TableCell>
                <TableCell className="font-semibold">Initial Balance</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-semibold bg-destructive/10 px-2 py-1 rounded">
                    -$50.00
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-semibold bg-destructive/10 px-2 py-1 rounded">
                    -$50.00
                  </span>
                </TableCell>
                <TableCell className="text-center">-</TableCell>
              </TableRow>

              {/* Sample Data */}
              <TableRow className="bg-muted/10">
                <TableCell className="font-medium">Sep 01, 2025</TableCell>
                <TableCell>Mensalidade</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-semibold bg-destructive/10 px-2 py-1 rounded">
                    -$500.00
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-bold bg-destructive/10 px-2 py-1 rounded">
                    -$550.00
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-medium">
                  -$550.00
                </TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              <TableRow className="bg-background">
                <TableCell className="font-medium">Sep 05, 2025</TableCell>
                <TableCell>Funds</TableCell>
                <TableCell className="text-right">
                  <span className="text-accent font-semibold bg-accent/10 px-2 py-1 rounded">
                    +$550.00
                  </span>
                </TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">
                  <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                    $0.00
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-medium">
                  $0.00
                </TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              <TableRow className="bg-muted/10">
                <TableCell className="font-medium">Sep 23, 2025</TableCell>
                <TableCell>Limpeza by Eli</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-semibold bg-destructive/10 px-2 py-1 rounded">
                    -$260.00
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-bold bg-destructive/10 px-2 py-1 rounded">
                    -$260.00
                  </span>
                </TableCell>
                <TableCell className="text-right text-muted-foreground font-medium">
                  -$260.00
                </TableCell>
                <TableCell>
                  <div className="flex justify-center space-x-1">
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary">
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>

              {/* Final Balance Row */}
              <TableRow className="bg-primary/5 border-t-2 border-primary/20">
                <TableCell className="font-medium text-muted-foreground">-</TableCell>
                <TableCell className="font-bold text-primary">Final Balance</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">-</TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-bold bg-destructive/20 px-3 py-2 rounded text-lg">
                    -$260.00
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-destructive font-bold bg-destructive/20 px-3 py-2 rounded text-lg">
                    -$260.00
                  </span>
                </TableCell>
                <TableCell className="text-center">-</TableCell>
              </TableRow>

              {/* Dynamic Entries */}
              {entries.map((entry, index) => (
                <TableRow key={entry.entry_id} className={index % 2 === 0 ? 'bg-background' : 'bg-muted/10'}>
                  <TableCell className="font-medium">{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{entry.description}</TableCell>
                  <TableCell className="text-right">
                    {entry.credit > 0 ? (
                      <span className="text-accent font-semibold bg-accent/10 px-2 py-1 rounded">
                        +${entry.credit.toFixed(2)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    {entry.debit > 0 ? (
                      <span className="text-destructive font-semibold bg-destructive/10 px-2 py-1 rounded">
                        -${entry.debit.toFixed(2)}
                      </span>
                    ) : '-'}
                  </TableCell>
                  <TableCell className="text-right">
                    <span className="font-bold text-primary bg-primary/10 px-2 py-1 rounded">
                      ${entry.balance?.toFixed(2) || '0.00'}
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-medium">
                    ${entry.scheduled_balance?.toFixed(2) || '0.00'}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-center space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEdit(entry)}
                        className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(entry.entry_id)}
                        className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 hover:bg-accent/10 hover:text-accent"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}