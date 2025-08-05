import { render, screen, fireEvent } from "@testing-library/react"
import { AddTestForm } from "./add-test-form"

describe("AddTestForm", () => {
  it("deve renderizar o formulário e permitir preencher campos", () => {
    render(<AddTestForm plans={[]} servers={[]} />)
    expect(screen.getByLabelText(/nome/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/usuário iptv/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/senha iptv/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/whatsapp/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/plano/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/servidor/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/observações/i)).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/nome/i), { target: { value: "Teste" } })
    expect(screen.getByLabelText(/nome/i)).toHaveValue("Teste")
  })
})