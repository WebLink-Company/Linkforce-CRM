import React from 'react';

// Sectores industriales según la clasificación DGII
export const INDUSTRY_SECTORS = [
  { code: 'A', name: 'Agricultura, Ganadería, Silvicultura y Pesca', subsectors: [
    'A01 - Agricultura, Ganadería, Caza',
    'A02 - Silvicultura y Extracción de Madera',
    'A03 - Pesca y Acuicultura'
  ]},
  { code: 'B', name: 'Explotación de Minas y Canteras', subsectors: [
    'B05 - Extracción de Carbón',
    'B06 - Extracción de Petróleo y Gas Natural',
    'B07 - Extracción de Minerales Metálicos',
    'B08 - Explotación de Otras Minas y Canteras'
  ]},
  { code: 'C', name: 'Industrias Manufactureras', subsectors: [
    'C10 - Elaboración de Productos Alimenticios',
    'C11 - Elaboración de Bebidas',
    'C13 - Fabricación de Productos Textiles',
    'C14 - Confección de Prendas de Vestir',
    'C15 - Fabricación de Productos de Cuero',
    'C20 - Fabricación de Sustancias y Productos Químicos'
  ]},
  { code: 'D', name: 'Suministro de Electricidad, Gas, Vapor y Aire Acondicionado', subsectors: [
    'D35 - Suministro de Electricidad, Gas, Vapor'
  ]},
  { code: 'E', name: 'Suministro de Agua; Evacuación de Aguas Residuales', subsectors: [
    'E36 - Captación, Tratamiento y Suministro de Agua',
    'E37 - Evacuación de Aguas Residuales',
    'E38 - Recolección y Tratamiento de Desechos'
  ]},
  { code: 'F', name: 'Construcción', subsectors: [
    'F41 - Construcción de Edificios',
    'F42 - Obras de Ingeniería Civil',
    'F43 - Actividades Especializadas de Construcción'
  ]},
  { code: 'G', name: 'Comercio al por Mayor y al por Menor', subsectors: [
    'G45 - Comercio de Vehículos Automotores',
    'G46 - Comercio al por Mayor',
    'G47 - Comercio al por Menor'
  ]},
  { code: 'H', name: 'Transporte y Almacenamiento', subsectors: [
    'H49 - Transporte Terrestre',
    'H50 - Transporte Acuático',
    'H51 - Transporte Aéreo',
    'H52 - Almacenamiento'
  ]},
  { code: 'I', name: 'Actividades de Alojamiento y Servicios de Comidas', subsectors: [
    'I55 - Actividades de Alojamiento',
    'I56 - Servicios de Comidas y Bebidas'
  ]},
  { code: 'J', name: 'Información y Comunicaciones', subsectors: [
    'J58 - Actividades de Edición',
    'J59 - Actividades de Producción de Videos',
    'J60 - Actividades de Programación y Transmisión',
    'J61 - Telecomunicaciones',
    'J62 - Programación Informática'
  ]},
  { code: 'K', name: 'Actividades Financieras y de Seguros', subsectors: [
    'K64 - Servicios Financieros',
    'K65 - Seguros y Fondos de Pensiones',
    'K66 - Actividades Auxiliares de Servicios Financieros'
  ]},
  { code: 'L', name: 'Actividades Inmobiliarias', subsectors: [
    'L68 - Actividades Inmobiliarias'
  ]},
  { code: 'M', name: 'Actividades Profesionales, Científicas y Técnicas', subsectors: [
    'M69 - Actividades Jurídicas y de Contabilidad',
    'M70 - Actividades de Consultoría de Gestión',
    'M71 - Servicios de Arquitectura e Ingeniería',
    'M72 - Investigación Científica',
    'M73 - Publicidad y Estudios de Mercado',
    'M74 - Otras Actividades Profesionales'
  ]},
  { code: 'N', name: 'Actividades de Servicios Administrativos y de Apoyo', subsectors: [
    'N77 - Actividades de Alquiler',
    'N78 - Actividades de Empleo',
    'N79 - Agencias de Viajes',
    'N80 - Actividades de Seguridad',
    'N81 - Servicios a Edificios y Paisajismo',
    'N82 - Actividades Administrativas de Oficina'
  ]},
  { code: 'O', name: 'Administración Pública y Defensa', subsectors: [
    'O84 - Administración Pública y Defensa'
  ]},
  { code: 'P', name: 'Enseñanza', subsectors: [
    'P85 - Enseñanza'
  ]},
  { code: 'Q', name: 'Actividades de Atención de la Salud Humana', subsectors: [
    'Q86 - Actividades de Atención de la Salud Humana',
    'Q87 - Actividades de Atención en Instituciones',
    'Q88 - Actividades de Asistencia Social'
  ]},
  { code: 'R', name: 'Actividades Artísticas, de Entretenimiento y Recreativas', subsectors: [
    'R90 - Actividades Creativas y Artísticas',
    'R91 - Bibliotecas, Archivos y Museos',
    'R92 - Juegos de Azar y Apuestas',
    'R93 - Actividades Deportivas y Recreativas'
  ]},
  { code: 'S', name: 'Otras Actividades de Servicios', subsectors: [
    'S94 - Actividades de Asociaciones',
    'S95 - Reparación de Computadoras',
    'S96 - Otras Actividades de Servicios Personales'
  ]}
];

interface IndustrySectorSelectorProps {
  value: string;
  onChange: (sector: string, subsector: string) => void;
  className?: string;
}

export default function IndustrySectorSelector({ value, onChange, className = '' }: IndustrySectorSelectorProps) {
  const [selectedSector, setSelectedSector] = React.useState('');
  const [selectedSubsector, setSelectedSubsector] = React.useState('');

  const handleSectorChange = (sectorCode: string) => {
    setSelectedSector(sectorCode);
    setSelectedSubsector('');
    onChange(sectorCode, '');
  };

  const handleSubsectorChange = (subsector: string) => {
    setSelectedSubsector(subsector);
    onChange(selectedSector, subsector);
  };

  const selectedSectorData = INDUSTRY_SECTORS.find(sector => sector.code === selectedSector);

  return (
    <div className={`space-y-4 ${className}`}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Sector Industrial Principal
        </label>
        <select
          value={selectedSector}
          onChange={(e) => handleSectorChange(e.target.value)}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
        >
          <option value="">Seleccione un sector</option>
          {INDUSTRY_SECTORS.map(sector => (
            <option key={sector.code} value={sector.code}>
              {sector.code} - {sector.name}
            </option>
          ))}
        </select>
      </div>

      {selectedSectorData && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Subsector Específico
          </label>
          <select
            value={selectedSubsector}
            onChange={(e) => handleSubsectorChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="">Seleccione un subsector</option>
            {selectedSectorData.subsectors.map(subsector => (
              <option key={subsector} value={subsector}>
                {subsector}
              </option>
            ))}
          </select>
        </div>
      )}

      {selectedSector && (
        <div className="bg-blue-50 p-4 rounded-md">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            Sector Seleccionado
          </h4>
          <p className="text-sm text-blue-900">
            {selectedSectorData?.name}
            {selectedSubsector && (
              <>
                <br />
                <span className="text-blue-700">{selectedSubsector}</span>
              </>
            )}
          </p>
        </div>
      )}
    </div>
  );
}