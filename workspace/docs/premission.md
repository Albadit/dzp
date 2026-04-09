Dit zal **niet goed werken in de app**, omdat het DNN-rolsysteem de rechten van een gebruiker **globaal controleert op paginaniveau**, en niet per actieve community-context binnen de app.

In jouw voorbeeld heeft dezelfde gebruiker:

* in **Community 1** de rol **Community Manager**
* in **Community 2** de rol **Lead**

Het probleem ontstaat zodra DNN bepaalt of iemand een pagina zoals **Manage** mag openen. DNN kijkt dan niet eerst naar: *“In welke community zit deze gebruiker nu?”* maar naar de rechten die op dat moment voor die pagina gelden. Daardoor kan de rol **Lead** ervoor zorgen dat toegang wordt geweigerd, ook al zou diezelfde gebruiker in een andere community via de rol **Community Manager** wél toegang moeten hebben.

Waarom dit niet werkt voor de app:

1. **DNN denkt in paginarechten, niet in community-specifieke context**
   De app werkt per community, maar DNN beveiligt pagina’s op portaal-/paginaniveau. Daardoor is er geen nette scheiding van rechten per community binnen dezelfde gebruiker.

2. **Eén gebruiker heeft meerdere rollen tegelijk**
   Voor DNN is dat één ingelogde gebruiker met een combinatie van rollen. Dat maakt het lastig om exact af te dwingen welke rechten gelden op basis van de community waarin de gebruiker zich op dat moment bevindt.

3. **Toegang wordt te vroeg geblokkeerd**
   Als de pagina **Manage** niet toegankelijk is voor de rol **Lead**, dan blokkeert DNN de pagina direct. De app krijgt dan vaak niet eens de kans om zelf nog te bepalen: *“Deze gebruiker zit nu in Community 1, dus hier mag hij als Community Manager wel naar binnen.”*

4. **De rechten in de app en in DNN lopen niet gelijk**
   De app wil rechten geven op basis van de geselecteerde community, maar DNN doet dat op basis van algemene paginarechten. Daardoor ontstaat een conflict tussen de logica van de app en de beveiliging van DNN.