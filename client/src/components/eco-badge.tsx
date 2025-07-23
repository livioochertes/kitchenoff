import { Badge } from "@/components/ui/badge";
import { Leaf, Recycle, Zap, TreePine, Award, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface EcoBadgeProps {
  product: {
    isEcoFriendly?: boolean | null;
    sustainabilityScore?: number | null;
    recycledMaterial?: boolean | null;
    biodegradable?: boolean | null;
    energyEfficient?: boolean | null;
    lowCarbonFootprint?: boolean | null;
    sustainableSourcing?: boolean | null;
    certifications?: string[] | null;
    co2ReductionPercent?: number | null;
    energySavingPercent?: number | null;
    recyclingInfo?: string | null;
  };
  variant?: "full" | "compact" | "simple";
}

export default function EcoBadge({ product, variant = "simple" }: EcoBadgeProps) {
  if (!product.isEcoFriendly) return null;

  const sustainabilityScore = product.sustainabilityScore || 0;
  const certifications = product.certifications || [];
  
  // Get sustainability level and color
  const getSustainabilityLevel = (score: number) => {
    if (score >= 80) return { level: "Excellent", color: "bg-green-600 text-white" };
    if (score >= 60) return { level: "Good", color: "bg-green-500 text-white" };
    if (score >= 40) return { level: "Fair", color: "bg-yellow-500 text-white" };
    return { level: "Basic", color: "bg-gray-500 text-white" };
  };

  const { level, color } = getSustainabilityLevel(sustainabilityScore);

  // Collect active eco features
  const ecoFeatures = [];
  if (product.recycledMaterial) ecoFeatures.push({ icon: Recycle, text: "Recycled Materials" });
  if (product.biodegradable) ecoFeatures.push({ icon: Leaf, text: "Biodegradable" });
  if (product.energyEfficient) ecoFeatures.push({ icon: Zap, text: "Energy Efficient" });
  if (product.lowCarbonFootprint) ecoFeatures.push({ icon: TreePine, text: "Low Carbon Footprint" });
  if (product.sustainableSourcing) ecoFeatures.push({ icon: Award, text: "Sustainably Sourced" });

  if (variant === "simple") {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge className="bg-green-100 text-green-800 hover:bg-green-200 cursor-help">
              <Leaf className="w-3 h-3 mr-1" />
              Eco-Friendly
            </Badge>
          </TooltipTrigger>
          <TooltipContent side="top" className="w-64">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-medium">Sustainability Score</span>
                <Badge className={`text-xs ${color}`}>{sustainabilityScore}/100</Badge>
              </div>
              {ecoFeatures.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium">Features:</p>
                  {ecoFeatures.slice(0, 3).map((feature, index) => (
                    <div key={index} className="flex items-center text-xs">
                      <feature.icon className="w-3 h-3 mr-1 text-green-600" />
                      {feature.text}
                    </div>
                  ))}
                  {ecoFeatures.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{ecoFeatures.length - 3} more features</p>
                  )}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  if (variant === "compact") {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <Leaf className="w-4 h-4 text-green-600 mr-2" />
            <span className="text-sm font-medium text-green-800">Eco-Friendly Product</span>
          </div>
          <Badge className={`text-xs ${color}`}>{level}</Badge>
        </div>
        
        {ecoFeatures.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {ecoFeatures.map((feature, index) => (
              <div key={index} className="flex items-center text-xs text-green-700">
                <feature.icon className="w-3 h-3 mr-1" />
                {feature.text}
              </div>
            ))}
          </div>
        )}
        
        {((product.co2ReductionPercent || 0) > 0 || (product.energySavingPercent || 0) > 0) && (
          <div className="flex gap-4 text-xs text-green-700">
            {(product.co2ReductionPercent || 0) > 0 && (
              <span>CO₂ Reduction: {product.co2ReductionPercent}%</span>
            )}
            {(product.energySavingPercent || 0) > 0 && (
              <span>Energy Saving: {product.energySavingPercent}%</span>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full variant
  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center">
          <div className="bg-green-100 p-2 rounded-full mr-3">
            <Leaf className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-green-800">Eco-Friendly Product</h3>
            <p className="text-sm text-green-600">Environmentally conscious choice</p>
          </div>
        </div>
        <div className="text-right">
          <Badge className={`${color} mb-1`}>{level}</Badge>
          <p className="text-xs text-green-600">{sustainabilityScore}/100 Score</p>
        </div>
      </div>

      {ecoFeatures.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-800 mb-2">Sustainability Features</h4>
          <div className="grid grid-cols-2 gap-2">
            {ecoFeatures.map((feature, index) => (
              <div key={index} className="flex items-center text-sm text-green-700">
                <feature.icon className="w-4 h-4 mr-2 text-green-600" />
                {feature.text}
              </div>
            ))}
          </div>
        </div>
      )}

      {((product.co2ReductionPercent || 0) > 0 || (product.energySavingPercent || 0) > 0) && (
        <div className="bg-white/50 rounded-lg p-3">
          <h4 className="text-sm font-medium text-green-800 mb-2">Environmental Impact</h4>
          <div className="grid grid-cols-2 gap-4">
            {(product.co2ReductionPercent || 0) > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{product.co2ReductionPercent}%</div>
                <div className="text-xs text-green-700">CO₂ Reduction</div>
              </div>
            )}
            {(product.energySavingPercent || 0) > 0 && (
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{product.energySavingPercent}%</div>
                <div className="text-xs text-green-700">Energy Saving</div>
              </div>
            )}
          </div>
        </div>
      )}

      {certifications.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-green-800 mb-2">Certifications</h4>
          <div className="flex flex-wrap gap-2">
            {certifications.map((cert, index) => (
              <Badge key={index} variant="outline" className="text-green-700 border-green-300">
                <Award className="w-3 h-3 mr-1" />
                {cert}
              </Badge>
            ))}
          </div>
        </div>
      )}

      {product.recyclingInfo && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start">
            <Info className="w-4 h-4 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 mb-1">Recycling Information</h4>
              <p className="text-sm text-blue-700">{product.recyclingInfo}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}