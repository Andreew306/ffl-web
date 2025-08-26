import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Mail, MessageSquare, Users, Trophy, Calendar, Phone, Clock } from "lucide-react"

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-4">
            Contacto
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            ¿Quieres unirte a la liga, tienes dudas o necesitas ayuda? Estamos aquí para ayudarte.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Contact Form */}
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-cyan-400 flex items-center">
                  <MessageSquare className="mr-2 h-6 w-6" />
                  Envíanos un Mensaje
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <form className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Nombre</label>
                      <Input placeholder="Tu nombre" className="bg-slate-700 border-slate-600 text-white" />
                    </div>
                    <div>
                      <label className="text-white text-sm font-medium mb-2 block">Email</label>
                      <Input
                        type="email"
                        placeholder="tu@email.com"
                        className="bg-slate-700 border-slate-600 text-white"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Tipo de Consulta</label>
                    <Select>
                      <SelectTrigger className="bg-slate-700 border-slate-600 text-white">
                        <SelectValue placeholder="Selecciona una opción" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="join-player">Unirme como Jugador</SelectItem>
                        <SelectItem value="join-team">Registrar Equipo</SelectItem>
                        <SelectItem value="casting">Ser Caster/Streamer</SelectItem>
                        <SelectItem value="sponsor">Patrocinio</SelectItem>
                        <SelectItem value="technical">Soporte Técnico</SelectItem>
                        <SelectItem value="other">Otro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Usuario de Haxball</label>
                    <Input placeholder="Tu nickname en Haxball" className="bg-slate-700 border-slate-600 text-white" />
                  </div>

                  <div>
                    <label className="text-white text-sm font-medium mb-2 block">Mensaje</label>
                    <Textarea
                      placeholder="Cuéntanos más detalles sobre tu consulta..."
                      className="bg-slate-700 border-slate-600 text-white min-h-[120px]"
                    />
                  </div>

                  <Button className="w-full bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600">
                    <Mail className="mr-2 h-4 w-4" />
                    Enviar Mensaje
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Contact Info & Quick Actions */}
            <div className="space-y-8">
              {/* Contact Information */}
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-purple-400 flex items-center">
                    <Phone className="mr-2 h-6 w-6" />
                    Información de Contacto
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <Mail className="h-5 w-5 text-cyan-400" />
                    <div>
                      <p className="text-white font-medium">Email</p>
                      <p className="text-gray-400">admin@futsalfusion.league</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <MessageSquare className="h-5 w-5 text-green-400" />
                    <div>
                      <p className="text-white font-medium">Discord</p>
                      <p className="text-gray-400">FutsalFusionLeague#1234</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-yellow-400" />
                    <div>
                      <p className="text-white font-medium">Horario de Atención</p>
                      <p className="text-gray-400">Lun-Dom: 18:00 - 24:00 (GMT-3)</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-green-400 flex items-center">
                    <Trophy className="mr-2 h-6 w-6" />
                    Acciones Rápidas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <Button className="w-full justify-start bg-blue-600 hover:bg-blue-700">
                      <Users className="mr-2 h-4 w-4" />
                      Registrar Nuevo Equipo
                    </Button>
                    <Button className="w-full justify-start bg-green-600 hover:bg-green-700">
                      <Calendar className="mr-2 h-4 w-4" />
                      Solicitar Partido Amistoso
                    </Button>
                    <Button className="w-full justify-start bg-purple-600 hover:bg-purple-700">
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Reportar Problema
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Requirements */}
              <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-yellow-500/20">
                <CardHeader>
                  <CardTitle className="text-xl font-bold text-yellow-400">Requisitos para Participar</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-start space-x-2">
                      <Badge variant="outline" className="mt-1">
                        1
                      </Badge>
                      <p className="text-gray-300 text-sm">Tener experiencia jugando Haxball</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Badge variant="outline" className="mt-1">
                        2
                      </Badge>
                      <p className="text-gray-300 text-sm">Disponibilidad para partidos (horarios establecidos)</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Badge variant="outline" className="mt-1">
                        3
                      </Badge>
                      <p className="text-gray-300 text-sm">Respetar el fair play y las reglas de la liga</p>
                    </div>
                    <div className="flex items-start space-x-2">
                      <Badge variant="outline" className="mt-1">
                        4
                      </Badge>
                      <p className="text-gray-300 text-sm">Tener Discord para comunicación</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 bg-black/20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl font-bold text-white mb-8 text-center">Preguntas Frecuentes</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-cyan-500/20">
              <CardContent className="p-6">
                <h3 className="text-cyan-400 font-bold mb-2">¿Cómo puedo unirme a la liga?</h3>
                <p className="text-gray-300 text-sm">
                  Puedes unirte como jugador individual o registrar un equipo completo. Contáctanos a través del
                  formulario o Discord.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-purple-500/20">
              <CardContent className="p-6">
                <h3 className="text-purple-400 font-bold mb-2">¿Cuándo son los partidos?</h3>
                <p className="text-gray-300 text-sm">
                  Los partidos se juegan principalmente entre semana por las noches (20:00-23:00 GMT-3) y fines de
                  semana.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-green-500/20">
              <CardContent className="p-6">
                <h3 className="text-green-400 font-bold mb-2">¿Hay algún costo por participar?</h3>
                <p className="text-gray-300 text-sm">
                  No, la participación en la liga es completamente gratuita. Solo necesitas tiempo y ganas de competir.
                </p>
              </CardContent>
            </Card>
            <Card className="bg-gradient-to-br from-slate-800 to-slate-900 border-red-500/20">
              <CardContent className="p-6">
                <h3 className="text-red-400 font-bold mb-2">¿Qué pasa si no puedo jugar un partido?</h3>
                <p className="text-gray-300 text-sm">
                  Debes avisar con al menos 24 horas de anticipación. Los equipos pueden usar suplentes registrados.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
    </div>
  )
}
