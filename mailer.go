package main

import (
	"mime"
	"net/smtp"
	"os"
	"strings"
)

// mailSender es lo único que el handler de contacto sabe del correo. En
// producción es smtpSender; en pruebas, fakeMailer (mailer_test.go).
type mailSender interface {
	Send(subject, body string) error
}

const (
	defaultContactAddress = "danielhrubio3@gmail.com"
	defaultSMTPHost       = "smtp.gmail.com"
	defaultSMTPPort       = "587"
)

// smtpSender manda correo por SMTP con STARTTLS (Gmail con contraseña de
// aplicación). smtp.SendMail negocia STARTTLS solo si el servidor lo ofrece.
type smtpSender struct {
	host, port, user, password, to string
}

func (s *smtpSender) Send(subject, body string) error {
	msg := strings.Join([]string{
		"From: SheepMaster <" + s.user + ">",
		"To: " + s.to,
		"Subject: " + mime.QEncoding.Encode("utf-8", subject),
		"MIME-Version: 1.0",
		"Content-Type: text/plain; charset=utf-8",
		"",
		body,
	}, "\r\n")
	auth := smtp.PlainAuth("", s.user, s.password, s.host)
	return smtp.SendMail(s.host+":"+s.port, auth, s.user, []string{s.to}, []byte(msg))
}

// newMailerFromEnv devuelve nil cuando no hay SMTP_PASSWORD: el endpoint
// entonces guarda el lead y no envía (el aviso se imprime al arrancar).
func newMailerFromEnv() mailSender {
	password := os.Getenv("SMTP_PASSWORD")
	if password == "" {
		return nil
	}
	user := os.Getenv("SMTP_USER")
	if user == "" {
		user = defaultContactAddress
	}
	to := os.Getenv("CONTACT_TO")
	if to == "" {
		to = defaultContactAddress
	}
	return &smtpSender{host: defaultSMTPHost, port: defaultSMTPPort, user: user, password: password, to: to}
}
