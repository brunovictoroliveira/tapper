import Header from '../components/Header.jsx'

const PRIVACY = {
  eyebrow: 'PRIVACIDADE E LGPD',
  title: 'Política de Privacidade',
  sections: [
    ['Dados tratados', 'O Tapper processa áudio localmente por padrão. Contas Cloud armazenam identificação da conta, músicas, projetos, metadados de arquivos, assinatura e eventos necessários para segurança e suporte.'],
    ['Finalidades', 'Os dados são usados para autenticação, sincronização, armazenamento, cobrança, recuperação de projetos, prevenção de fraude e atendimento de solicitações.'],
    ['Compartilhamento', 'Supabase, Netlify, Cloudflare e Mercado Pago atuam como fornecedores da infraestrutura descrita nesta política. O áudio somente é enviado quando o usuário escolhe guardá-lo na nuvem.'],
    ['Retenção e direitos', 'O usuário pode exportar seus dados e solicitar exclusão pela área da conta. Prazos finais, controlador e canal de privacidade devem ser preenchidos e aprovados antes do lançamento.'],
  ],
}

const TERMS = {
  eyebrow: 'CONDIÇÕES DO SERVIÇO',
  title: 'Termos de Uso',
  sections: [
    ['Serviço', 'O Tapper oferece ferramentas locais gratuitas e recursos Cloud sujeitos a conta, assinatura e limites de uso informados na interface.'],
    ['Assinatura', 'O Tapper Cloud custa R$ 9,99 por mês. A renovação, os meios de pagamento e as tentativas de cobrança são operados pelo Mercado Pago.'],
    ['Cancelamento', 'Após o cancelamento, novos uploads e alterações são bloqueados. A biblioteca permanece disponível para leitura e exportação durante o período de retenção informado ao usuário.'],
    ['Responsabilidade do usuário', 'O usuário declara possuir autorização para processar e armazenar os arquivos enviados e não deve usar o serviço para conteúdo ilícito ou que viole direitos de terceiros.'],
    ['Versão para revisão', 'Os dados do fornecedor, foro, atendimento e redação jurídica final dependem de aprovação manual antes da publicação comercial.'],
  ],
}

export default function LegalPage({ type }) {
  const document = type === 'privacy' ? PRIVACY : TERMS
  return (
    <main className="app-shell legal-shell">
      <Header action={<span className="topbar-label">DOCUMENTOS</span>} />
      <a className="back-link" href="/">← Início</a>
      <article>
        <p className="eyebrow">{document.eyebrow}</p>
        <h1>{document.title}</h1>
        <p className="legal-draft">Minuta técnica — revisão jurídica pendente.</p>
        {document.sections.map(([title, content]) => <section key={title}><h2>{title}</h2><p>{content}</p></section>)}
      </article>
    </main>
  )
}
