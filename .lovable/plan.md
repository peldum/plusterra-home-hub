Diagnóstico: Ctrl+F5 no alcanza para cortar este problema porque el dominio PlusPy funciona como PWA. El navegador puede seguir usando el service worker y cachés anteriores, y al mismo tiempo el dashboard interno dispara muchas consultas en paralelo apenas recupera la sesión. El guard actual ya no debería romper la app, pero todavía puede detectar actividad repetida cuando varios widgets cargan al mismo tiempo después de un refresh fuerte.

Plan de corrección definitiva:

1. Ajustar la PWA para el dominio interno
- Activar limpieza de cachés antiguas.
- Forzar que el nuevo service worker tome control inmediatamente.
- Evitar que HTML/JS principal queden servidos desde una caché vieja en PlusPy.
- Mantener caché útil solo donde aporta valor, como imágenes públicas/recursos estáticos seguros.

2. Ordenar el arranque post-login
- Esperar a que autenticación, rol y perfil estén estabilizados antes de montar el dashboard pesado.
- Evitar que los widgets consulten mientras el usuario todavía está en transición de sesión.
- Reducir el efecto de Ctrl+F5, TOKEN_REFRESHED y recuperación de sesión sobre las consultas iniciales.

3. Consolidar consultas duplicadas del dashboard
- Revisar widgets que llaman los mismos hooks o datos equivalentes.
- Estabilizar fechas/periodos en `useContractForecast`, `RentCollectionWidget` y otros hooks del primer render.
- Agregar `staleTime`, `refetchOnWindowFocus: false` y cooldowns donde falten.

4. Mejorar el guard para diagnóstico real
- Mantener la app funcionando aunque se detecte repetición.
- Registrar en consola la URL/query exacta culpable con stack reducido.
- Evitar mostrar avisos repetidos al usuario durante el mismo refresh.

5. Validación
- Probar refresh fuerte en PlusPy.
- Confirmar que no aparece pantalla roja ni vaciado del dashboard.
- Confirmar que si queda alguna repetición, aparece identificada en consola sin tumbar la app.