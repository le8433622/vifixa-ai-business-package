'use client';

import { useState, useEffect } from 'react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, TrendingUp, DollarSign, Clock, MapPin, Star, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface PricingRule {
  id: string;
  name: string;
  rule_type: string;
  is_active: boolean;
  multiplier: number;
  fixed_surcharge: number;
  priority: number;
  description: string;
  location_ids: string[] | null;
  service_categories: string[] | null;
  worker_skill_levels: number[] | null;
  time_ranges: any;
  demand_threshold: number | null;
}

export default function PricingSettings() {
  const supabase = createClientComponentClient();
  const [rules, setRules] = useState<PricingRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    rule_type: 'time_based',
    multiplier: 1.0,
    fixed_surcharge: 0,
    priority: 100,
    description: '',
    is_active: true,
  });

  useEffect(() => {
    fetchRules();
  }, []);

  async function fetchRules() {
    try {
      const { data, error } = await supabase
        .from('pricing_rules')
        .select('*')
        .order('priority', { ascending: true });

      if (error) throw error;
      setRules(data || []);
    } catch (error: any) {
      console.error('Error fetching pricing rules:', error);
      toast.error('Không thể tải danh sách quy tắc giá');
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    try {
      if (editingRule) {
        const { error } = await supabase
          .from('pricing_rules')
          .update(formData)
          .eq('id', editingRule.id);

        if (error) throw error;
        toast.success('Cập nhật quy tắc giá thành công');
      } else {
        const { error } = await supabase
          .from('pricing_rules')
          .insert([formData]);

        if (error) throw error;
        toast.success('Thêm quy tắc giá thành công');
      }

      setIsDialogOpen(false);
      setEditingRule(null);
      setFormData({
        name: '',
        rule_type: 'time_based',
        multiplier: 1.0,
        fixed_surcharge: 0,
        priority: 100,
        description: '',
        is_active: true,
      });
      fetchRules();
    } catch (error: any) {
      console.error('Error saving pricing rule:', error);
      toast.error('Không thể lưu quy tắc giá: ' + error.message);
    }
  }

  async function toggleRuleActive(rule: PricingRule) {
    try {
      const { error } = await supabase
        .from('pricing_rules')
        .update({ is_active: !rule.is_active })
        .eq('id', rule.id);

      if (error) throw error;
      toast.success(rule.is_active ? 'Đã vô hiệu hóa quy tắc' : 'Đã kích hoạt quy tắc');
      fetchRules();
    } catch (error: any) {
      toast.error('Không thể cập nhật trạng thái: ' + error.message);
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Bạn có chắc muốn xóa quy tắc giá này?')) return;

    try {
      const { error } = await supabase
        .from('pricing_rules')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Đã xóa quy tắc giá');
      fetchRules();
    } catch (error: any) {
      toast.error('Không thể xóa: ' + error.message);
    }
  }

  function editRule(rule: PricingRule) {
    setEditingRule(rule);
    setFormData({
      name: rule.name,
      rule_type: rule.rule_type,
      multiplier: rule.multiplier,
      fixed_surcharge: rule.fixed_surcharge,
      priority: rule.priority,
      description: rule.description,
      is_active: rule.is_active,
    });
    setIsDialogOpen(true);
  }

  function getRuleTypeIcon(type: string) {
    switch (type) {
      case 'time_based': return <Clock className="w-4 h-4" />;
      case 'location': return <MapPin className="w-4 h-4" />;
      case 'skill': return <Star className="w-4 h-4" />;
      case 'emergency': return <AlertTriangle className="w-4 h-4" />;
      case 'surge': return <TrendingUp className="w-4 h-4" />;
      default: return <DollarSign className="w-4 h-4" />;
    }
  }

  function getRuleTypeLabel(type: string) {
    const labels: Record<string, string> = {
      time_based: 'Theo thời gian',
      location: 'Theo khu vực',
      skill: 'Theo kỹ năng',
      emergency: 'Khẩn cấp',
      surge: 'Surge Pricing',
      demand: 'Theo nhu cầu',
    };
    return labels[type] || type;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dynamic Pricing</h1>
          <p className="text-muted-foreground">Cấu hình quy tắc giá linh hoạt để tối ưu doanh thu</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => { setEditingRule(null); setFormData({ name: '', rule_type: 'time_based', multiplier: 1.0, fixed_surcharge: 0, priority: 100, description: '', is_active: true }); }}>
              <Plus className="w-4 h-4 mr-2" />
              Thêm quy tắc
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingRule ? 'Chỉnh sửa quy tắc giá' : 'Thêm quy tắc giá mới'}</DialogTitle>
              <DialogDescription>
                Cấu hình quy tắc dynamic pricing cho hệ thống
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="name">Tên quy tắc</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Giờ cao điểm tối"
                  required
                />
              </div>
              <div>
                <Label htmlFor="rule_type">Loại quy tắc</Label>
                <Select
                  value={formData.rule_type}
                  onValueChange={(value) => setFormData({ ...formData, rule_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="time_based">Theo thời gian</SelectItem>
                    <SelectItem value="location">Theo khu vực</SelectItem>
                    <SelectItem value="skill">Theo kỹ năng</SelectItem>
                    <SelectItem value="emergency">Khẩn cấp</SelectItem>
                    <SelectItem value="surge">Surge Pricing</SelectItem>
                    <SelectItem value="demand">Theo nhu cầu</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="multiplier">Hệ số nhân (1.0-5.0)</Label>
                  <Input
                    id="multiplier"
                    type="number"
                    step="0.1"
                    min="1.0"
                    max="5.0"
                    value={formData.multiplier}
                    onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) || 1.0 })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="fixed_surcharge">Phí cố định (VNĐ)</Label>
                  <Input
                    id="fixed_surcharge"
                    type="number"
                    min="0"
                    value={formData.fixed_surcharge}
                    onChange={(e) => setFormData({ ...formData, fixed_surcharge: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="priority">Độ ưu tiên (số nhỏ = ưu tiên cao)</Label>
                <Input
                  id="priority"
                  type="number"
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 100 })}
                />
              </div>
              <div>
                <Label htmlFor="description">Mô tả</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả quy tắc..."
                />
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
                />
                <Label htmlFor="is_active">Kích hoạt</Label>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Hủy
                </Button>
                <Button type="submit">
                  {editingRule ? 'Cập nhật' : 'Thêm mới'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="rules">
        <TabsList>
          <TabsTrigger value="rules">Quy tắc giá</TabsTrigger>
          <TabsTrigger value="analytics">Phân tích</TabsTrigger>
        </TabsList>
        <TabsContent value="rules" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Danh sách quy tắc</CardTitle>
              <CardDescription>
                Các quy tắc được áp dụng theo thứ tự ưu tiên (số nhỏ = ưu tiên cao)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tên</TableHead>
                    <TableHead>Loại</TableHead>
                    <TableHead>Hệ số</TableHead>
                    <TableHead>Phí cố định</TableHead>
                    <TableHead>Ưu tiên</TableHead>
                    <TableHead>Trạng thái</TableHead>
                    <TableHead className="text-right">Thao tác</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getRuleTypeIcon(rule.rule_type)}
                          <Badge variant="secondary">{getRuleTypeLabel(rule.rule_type)}</Badge>
                        </div>
                      </TableCell>
                      <TableCell>x{rule.multiplier}</TableCell>
                      <TableCell>{rule.fixed_surcharge.toLocaleString()}₫</TableCell>
                      <TableCell>#{rule.priority}</TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={() => toggleRuleActive(rule)}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button variant="ghost" size="sm" onClick={() => editRule(rule)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteRule(rule.id)}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {rules.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  Chưa có quy tắc giá nào. Hãy thêm quy tắc đầu tiên!
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Phân tích hiệu quả Dynamic Pricing</CardTitle>
              <CardDescription>Theo dõi tác động của dynamic pricing đến doanh thu</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Doanh thu tăng thêm</CardDescription>
                    <CardTitle className="text-2xl">+23%</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">So với giá cố định</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Số đơn hàng surge pricing</CardDescription>
                    <CardTitle className="text-2xl">145</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Trong tháng này</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardDescription>Giá trị trung bình/đơn</CardDescription>
                    <CardTitle className="text-2xl">₫425,000</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">Tăng 18% so với trước</p>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
