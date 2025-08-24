import { render, screen, fireEvent } from "@testing-library/react"
import { AddTestForm } from "./add-test-form"

// Mock dos componentes internos
jest.mock('@/components/tests/test-type-selector', () => ({
  __esModule: true,
  TestTypeSelector: ({ onSelectType }: { onSelectType: (type: string) => void }) => (
    <div>
      <button onClick={() => onSelectType('manual')}>Teste Manual</button>
      <button onClick={() => onSelectType('automatic')}>Teste Automático</button>
    </div>
  )
}))

jest.mock('@/components/tests/manual-test-form', () => ({
  __esModule: true,
  ManualTestForm: () => (
    <div>
      <label htmlFor="name">Nome</label>
      <input id="name" />
      <label htmlFor="iptvUsername">Usuário IPTV</label>
      <input id="iptvUsername" />
      <label htmlFor="iptvPassword">Senha IPTV</label>
      <input id="iptvPassword" />
      <label htmlFor="whatsapp">WhatsApp</label>
      <input id="whatsapp" />
      <label htmlFor="serverId">Servidor</label>
      <select id="serverId" />
      <label htmlFor="observations">Observações</label>
      <textarea id="observations" />
    </div>
  )
}))

jest.mock('@/components/tests/automatic-test-form', () => ({
  __esModule: true,
  AutomaticTestForm: () => <div>Formulário de Teste Automático</div>
}))

describe("AddTestForm", () => {
  it("deve renderizar o seletor de tipo de teste após abrir o diálogo", () => {
    render(<AddTestForm plans={[]} servers={[]} />)

    // Abre o diálogo
    const openButton = screen.getByRole('button', { name: /criar teste/i })
    fireEvent.click(openButton)

    expect(screen.getByText("Teste Manual")).toBeInTheDocument()
    expect(screen.getByText("Teste Automático")).toBeInTheDocument()
  })

  it("deve renderizar o formulário manual quando selecionado", () => {
    render(<AddTestForm plans={[]} servers={[]} />)

    // Abre o diálogo
    const openButton = screen.getByRole('button', { name: /criar teste/i })
    fireEvent.click(openButton)
    
    const manualButton = screen.getByText("Teste Manual")
    fireEvent.click(manualButton)
    
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/usuário iptv/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha iptv/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/servidor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument()
  })
})