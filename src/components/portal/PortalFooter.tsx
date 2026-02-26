import { Building2 } from 'lucide-react';

export const PortalFooter = () => (
  <footer className="bg-[#00447C] text-white/80 mt-auto">
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#FC5100] flex items-center justify-center text-white font-black text-xs">
            P+
          </div>
          <span className="font-semibold text-white">Plusterra Inmobiliaria</span>
        </div>
        <p className="text-sm text-white/60">
          © {new Date().getFullYear()} Plusterra. Todos los derechos reservados.
        </p>
      </div>
    </div>
  </footer>
);
