import type { Metadata } from "next";

// Dados oficiais da empresa — devem bater exatamente com o Cartão CNPJ.
const EMPRESA = {
  nomeComercial: "GS Performance Digital",
  razaoSocial: "GS PERFORMANCE DIGITAL LTDA",
  cnpj: "48.553.258/0001-41",
  endereco: "Av. da Uva, 295 – Poste, Jundiaí – SP, CEP 13213-235",
  telefone: "(11) 97509-2812",
  email: "guhenri779@gmail.com",
  instagram: "https://www.instagram.com/guhsouza_23/",
};

export const metadata: Metadata = {
  title: `${EMPRESA.nomeComercial} · Gestão comercial e marketing para clínicas`,
  description: "Gestão de tráfego, CRM, atendimento com IA e estrutura comercial para clínicas e infoprodutores.",
};

const servicos = [
  {
    titulo: "Clínicas",
    texto: "Atendimento com IA no WhatsApp, CRM integrado, anúncios e painel de números para transformar leads em pacientes.",
  },
  {
    titulo: "Infoprodutores",
    texto: "Estrutura de funil, rastreamento de vendas, criativos e escala de campanhas para produtos perpétuos.",
  },
  {
    titulo: "Tecnologia própria",
    texto: "GS Gestão Clínica: plataforma de CRM e gestão comercial com acesso para a clínica e acompanhamento da agência.",
  },
];

export default function EmpresaPage() {
  return (
    <main className="min-h-screen bg-white text-black">
      <header className="bg-black px-6 py-20 text-white">
        <div className="mx-auto max-w-4xl space-y-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white font-serif text-lg text-black">GS</div>
          <h1 className="font-serif text-5xl leading-tight md:text-6xl">{EMPRESA.nomeComercial}</h1>
          <p className="max-w-2xl text-lg text-neutral-300">
            Gestão comercial, marketing e tecnologia para clínicas e infoprodutores.
          </p>
          <a href={`mailto:${EMPRESA.email}`} className="inline-flex min-h-11 items-center rounded-lg bg-white px-5 text-sm font-semibold text-black no-underline hover:bg-neutral-200">
            Fale conosco
          </a>
        </div>
      </header>

      <section aria-labelledby="servicos" className="px-6 py-16">
        <div className="mx-auto max-w-4xl space-y-8">
          <h2 id="servicos" className="font-serif text-4xl">O que fazemos</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {servicos.map((s) => (
              <div key={s.titulo} className="rounded-xl border border-neutral-200 p-6">
                <h3 className="text-lg font-semibold">{s.titulo}</h3>
                <p className="mt-2 text-sm text-neutral-700">{s.texto}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section aria-labelledby="contato" className="border-t border-neutral-200 px-6 py-16">
        <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
          <div className="space-y-2">
            <h2 id="contato" className="font-serif text-4xl">Contato</h2>
            <p className="text-sm text-neutral-700">Sediada em Jundiaí – SP. Atendemos clínicas e empresas em todo o Brasil.</p>
          </div>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-neutral-600">E-mail</dt><dd className="font-semibold"><a href={`mailto:${EMPRESA.email}`} className="text-black">{EMPRESA.email}</a></dd></div>
            <div><dt className="text-neutral-600">Telefone</dt><dd className="font-semibold">{EMPRESA.telefone}</dd></div>
            <div><dt className="text-neutral-600">Endereço</dt><dd className="font-semibold">{EMPRESA.endereco}</dd></div>
            <div><dt className="text-neutral-600">Instagram</dt><dd className="font-semibold"><a href={EMPRESA.instagram} className="text-black">@guhsouza_23</a></dd></div>
          </dl>
        </div>
      </section>

      <footer className="bg-black px-6 py-8 text-sm text-neutral-300">
        <div className="mx-auto flex max-w-4xl flex-wrap justify-between gap-3">
          <p>{EMPRESA.razaoSocial} · CNPJ {EMPRESA.cnpj}</p>
          <p>{EMPRESA.endereco}</p>
        </div>
      </footer>
    </main>
  );
}
