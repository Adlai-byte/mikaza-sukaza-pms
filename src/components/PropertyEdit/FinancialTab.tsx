import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from '@/components/ui/table';
import { Plus, Edit, Trash2, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

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
      <div className="animate-pulse">
        <div className="h-64 bg-muted rounded"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Financial Entries</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            <Button className="bg-green-600 hover:bg-green-700">
              Create
            </Button>
            <Button variant="destructive">
              Debit
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700">
              Owner Payment
            </Button>
            <Button className="bg-orange-600 hover:bg-orange-700">
              March Entry
            </Button>
          </div>

          {/* Month Selection */}
          <div className="flex items-center gap-4">
            <Label>Monthly Entries</Label>
            <Input
              type="text"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-32"
            />
            <Button 
              onClick={loadMonth}
              className="bg-purple-600 hover:bg-purple-700"
            >
              Load
            </Button>
          </div>

          {/* Add Entry Button */}
          <Button onClick={() => setShowForm(true)} className="mb-4">
            <Plus className="mr-2 h-4 w-4" />
            Add Entry
          </Button>

          {/* Entry Form */}
          {showForm && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>{editingEntry ? 'Edit Entry' : 'Add New Entry'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="entry_date">Date</Label>
                    <Input
                      id="entry_date"
                      type="date"
                      value={formData.entry_date}
                      onChange={(e) => handleInputChange('entry_date', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Entry description"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="credit">Credit</Label>
                    <Input
                      id="credit"
                      type="number"
                      step="0.01"
                      value={formData.credit}
                      onChange={(e) => handleInputChange('credit', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="debit">Debit</Label>
                    <Input
                      id="debit"
                      type="number"
                      step="0.01"
                      value={formData.debit}
                      onChange={(e) => handleInputChange('debit', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="balance">Balance</Label>
                    <Input
                      id="balance"
                      type="number"
                      step="0.01"
                      value={formData.balance}
                      onChange={(e) => handleInputChange('balance', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="scheduled_balance">Scheduled Balance</Label>
                    <Input
                      id="scheduled_balance"
                      type="number"
                      step="0.01"
                      value={formData.scheduled_balance}
                      onChange={(e) => handleInputChange('scheduled_balance', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                    {editingEntry ? 'Update' : 'Save'}
                  </Button>
                  <Button onClick={resetForm} variant="destructive">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Financial Table */}
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Credit</TableHead>
                    <TableHead>Debit</TableHead>
                    <TableHead>Balance</TableHead>
                    <TableHead>Scheduled Balance</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* Initial Balance Row */}
                  <TableRow>
                    <TableCell>-</TableCell>
                    <TableCell>Initial Balance</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-red-600">-50.00</TableCell>
                    <TableCell className="text-red-600">-50.00</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>

                  {/* Sample Entries */}
                  <TableRow>
                    <TableCell>9/1/2025</TableCell>
                    <TableCell>Mensalidade</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>500.00</TableCell>
                    <TableCell className="text-red-600">-550.00</TableCell>
                    <TableCell className="text-red-600">-550.00</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="destructive" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>9/5/2025</TableCell>
                    <TableCell>Funds</TableCell>
                    <TableCell>550.00</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>0.00</TableCell>
                    <TableCell>0.00</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="destructive" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  <TableRow>
                    <TableCell>9/23/2025</TableCell>
                    <TableCell>Limpeza by Eli</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>260.00</TableCell>
                    <TableCell className="text-red-600">-260.00</TableCell>
                    <TableCell className="text-red-600">-260.00</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="sm" variant="destructive" className="h-6 w-6 p-0">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                          <Download className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>

                  {/* Final Balance Row */}
                  <TableRow className="font-semibold">
                    <TableCell>-</TableCell>
                    <TableCell>Final Balance</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell>-</TableCell>
                    <TableCell className="text-red-600">-260.00</TableCell>
                    <TableCell className="text-red-600">-260.00</TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>

                  {/* Dynamic Entries */}
                  {entries.map((entry) => (
                    <TableRow key={entry.entry_id}>
                      <TableCell>{new Date(entry.entry_date).toLocaleDateString()}</TableCell>
                      <TableCell>{entry.description}</TableCell>
                      <TableCell>{entry.credit > 0 ? entry.credit.toFixed(2) : '-'}</TableCell>
                      <TableCell>{entry.debit > 0 ? entry.debit.toFixed(2) : '-'}</TableCell>
                      <TableCell className={entry.balance < 0 ? 'text-red-600' : ''}>
                        {entry.balance.toFixed(2)}
                      </TableCell>
                      <TableCell className={entry.scheduled_balance < 0 ? 'text-red-600' : ''}>
                        {entry.scheduled_balance.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(entry.entry_id)}
                            className="h-6 w-6 p-0"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => startEdit(entry)}
                            className="h-6 w-6 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="outline" className="h-6 w-6 p-0">
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </CardContent>
      </Card>
    </div>
  );
}