import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { DialogFooter } from '@/components/ui/dialog';
import { TheBestPackage, HubControlPlan, MappingFormData } from './types';

interface MappingFormProps {
  formData: MappingFormData;
  setFormData: React.Dispatch<React.SetStateAction<MappingFormData>>;
  packages: TheBestPackage[];
  plans: HubControlPlan[];
  onSubmit: () => void;
  onCancel: () => void;
  isEditing?: boolean;
  isLoading?: boolean;
}

export function MappingForm({
  formData,
  setFormData,
  packages,
  plans,
  onSubmit,
  onCancel,
  isEditing = false,
  isLoading = false
}: MappingFormProps) {
  const selectedPackage = packages.find(p => p.id === formData.thebest_package_id);
  const selectedPlan = plans.find(p => p.id === formData.hubcontrol_plan_id);

  return (
    <div className="space-y-6">
      {/* Seleção de Pacote e Plano */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="thebest_package">Pacote TheBest</Label>
          {isEditing ? (
            <div className="p-2 bg-muted rounded text-sm">
              {selectedPackage?.name || 'N/A'}
            </div>
          ) : (
            <Select
              value={formData.thebest_package_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, thebest_package_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um pacote" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    <div>
                      <div className="font-medium">{pkg.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {pkg.telas} telas • R$ {pkg.price}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="hubcontrol_plan">Plano HubControl</Label>
          {isEditing ? (
            <div className="p-2 bg-muted rounded text-sm">
              {selectedPlan?.name || 'N/A'}
            </div>
          ) : (
            <Select
              value={formData.hubcontrol_plan_id}
              onValueChange={(value) => setFormData(prev => ({ ...prev, hubcontrol_plan_id: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione um plano" />
              </SelectTrigger>
              <SelectContent>
                {plans.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    <div>
                      <div className="font-medium">{plan.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {plan.screens} telas • {plan.validity} dias
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Configurações Básicas */}
      <div className="space-y-4">
        <h4 className="font-medium">Configurações Básicas</h4>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
            />
            <Label htmlFor="is_active">Ativo</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="is_default"
              checked={formData.is_default}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_default: checked }))}
            />
            <Label htmlFor="is_default">Padrão</Label>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Configurações de Sincronização */}
      <div className="space-y-4">
        <h4 className="font-medium">Configurações de Sincronização</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="sync_price"
              checked={formData.sync_price}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_price: checked }))}
            />
            <Label htmlFor="sync_price">Sincronizar Preço</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="sync_validity"
              checked={formData.sync_validity}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_validity: checked }))}
            />
            <Label htmlFor="sync_validity">Sincronizar Validade</Label>
          </div>
          
          <div className="flex items-center space-x-2">
            <Switch
              id="sync_screens"
              checked={formData.sync_screens}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, sync_screens: checked }))}
            />
            <Label htmlFor="sync_screens">Sincronizar Telas</Label>
          </div>
        </div>
      </div>
      
      <Separator />
      
      {/* Valores Customizados */}
      <div className="space-y-4">
        <h4 className="font-medium">Valores Customizados (Opcional)</h4>
        
        <div className="grid grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="override_price">Preço Customizado</Label>
            <Input
              id="override_price"
              type="number"
              step="0.01"
              placeholder="0.00"
              value={formData.override_price}
              onChange={(e) => setFormData(prev => ({ ...prev, override_price: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="override_validity">Validade Customizada (dias)</Label>
            <Input
              id="override_validity"
              type="number"
              placeholder="30"
              value={formData.override_validity}
              onChange={(e) => setFormData(prev => ({ ...prev, override_validity: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="override_screens">Telas Customizadas</Label>
            <Input
              id="override_screens"
              type="number"
              placeholder="1"
              value={formData.override_screens}
              onChange={(e) => setFormData(prev => ({ ...prev, override_screens: e.target.value }))}
            />
          </div>
        </div>
      </div>
      
      {/* Botões de Ação */}
      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancelar
        </Button>
        <Button onClick={onSubmit} disabled={isLoading}>
          {isLoading ? 'Salvando...' : (isEditing ? 'Salvar Alterações' : 'Criar Mapeamento')}
        </Button>
      </DialogFooter>
    </div>
  );
}

export default MappingForm;
