import express from 'express';
import { ObjectId } from 'mongodb';
import { authenticate } from '../middleware/auth.js';
import { format, isBefore, parseISO } from 'date-fns';

const router = express.Router();


const convertTimeToMinutes = (timeStr) => {
  if (!timeStr) return 0;
  const [hours, minutes] = timeStr.trim().split(':').map(Number);
  return hours * 60 + (minutes || 0);
};


const updateArtistCalendar = async (db, booking) => {
  try {
    const artistId = booking.artistId;
    const startDate = new Date(booking.eventDate);
    const endDate = new Date(booking.endDate || booking.eventDate);

    const dates = [];
    let currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const artist = await db.collection('users').findOne(
      { _id: new ObjectId(artistId) },
      { projection: { availability: 1 } }
    );

    const currentAvailability = artist?.availability || {};

    
    const eventStartMinutes = convertTimeToMinutes(booking.startTime);
    const eventEndMinutes = convertTimeToMinutes(booking.endTime);

    for (const date of dates) {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayAvailability = currentAvailability[dateKey] || {
        isAvailable: true,
        timeSlots: {}
      };

      const timeSlots = [
        '00:00 - 02:00', '02:00 - 04:00', '04:00 - 06:00',
        '06:00 - 08:00', '08:00 - 10:00', '10:00 - 12:00',
        '12:00 - 14:00', '14:00 - 16:00', '16:00 - 18:00',
        '18:00 - 20:00', '20:00 - 22:00', '22:00 - 00:00'
      ];

      
      const isFirstDay = date.getTime() === startDate.getTime();
      const isLastDay = date.getTime() === endDate.getTime();

      timeSlots.forEach(slot => {
        const [slotStart, slotEnd] = slot.split(' - ');
        let slotStartMinutes = convertTimeToMinutes(slotStart);
        let slotEndMinutes = convertTimeToMinutes(slotEnd);

        if (slot === '22:00 - 00:00') {
          slotEndMinutes = 24 * 60;
        }

        
        const dayStartMinutes = isFirstDay ? eventStartMinutes : 0;
        const dayEndMinutes = isLastDay ? eventEndMinutes : 24 * 60;

        const slotOverlaps = (dayStartMinutes < slotEndMinutes) && (dayEndMinutes > slotStartMinutes);

        if (slotOverlaps) {
          
          const isFirstSlot = isFirstDay && slotStartMinutes <= eventStartMinutes && eventStartMinutes < slotEndMinutes;
          const isLastSlot = isLastDay && slotStartMinutes < eventEndMinutes && eventEndMinutes <= slotEndMinutes;

          dayAvailability.timeSlots[slot] = {
            isBooked: true,
            bookingId: booking._id.toString(),
            eventType: booking.eventType || 'Wydarzenie',
            eventLocation: booking.eventLocation || '',
            exactStartTime: formatTimeForDisplay(booking.startTime),
            exactEndTime: formatTimeForDisplay(booking.endTime),
            isFirstSlot,
            isLastSlot,
            bookingUrl: `/contract/${booking._id.toString()}`,
            clientName: booking.clientName
          };
        }
      });

      currentAvailability[dateKey] = dayAvailability;
    }

    await db.collection('users').updateOne(
      { _id: new ObjectId(artistId) },
      { $set: { availability: currentAvailability } }
    );
  } catch (error) {
    console.error('Błąd aktualizacji kalendarza:', error);
    throw error;
  }
};


const formatTimeForDisplay = (timeStr) => {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  return `${hours.padStart(2, '0')}:${(minutes || '00').padStart(2, '0')}`;
};


router.get('/unread', authenticate, async (req, res) => {
  try {
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { unreadBookings: 1 } }
    );
    
    res.status(200).json({
      success: true,
      unreadBookings: user?.unreadBookings?.map(id => id.toString()) || []
    });
  } catch (error) {
    console.error('Błąd pobierania nieprzeczytanych zgłoszeń:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd pobierania nieprzeczytanych zgłoszeń'
    });
  }
});


router.post('/:id/mark-as-read', authenticate, async (req, res) => {
  try {
    await req.db.collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $pull: { unreadBookings: new ObjectId(req.params.id) } }
    );
    
    res.status(200).json({ success: true });
  } catch (error) {
    console.error('Błąd oznaczania zgłoszenia jako przeczytane:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd oznaczania zgłoszenia jako przeczytane'
    });
  }
});

router.get('/unread-count', authenticate, async (req, res) => {
  try {
    const user = await req.db.collection('users').findOne(
      { _id: new ObjectId(req.user.id) },
      { projection: { unreadBookings: 1 } }
    );
    
    res.status(200).json({
      success: true,
      count: user?.unreadBookings?.length || 0
    });
  } catch (error) {
    console.error('Błąd pobierania liczby nieprzeczytanych zgłoszeń:', error);
    res.status(500).json({
      success: false,
      message: 'Błąd pobierania liczby nieprzeczytanych zgłoszeń'
    });
  }
});


router.post('/', authenticate, async (req, res) => {
  try {
    
    const userProfile = await req.db.collection('profiles').findOne({
      userId: new ObjectId(req.user.id)
    });

    if (!userProfile || userProfile.accountType === 'musician') {
      return res.status(403).json({
        success: false,
        message: 'Tylko klienci mogą składać rezerwacje'
      });
    }

    const {
      offerId,
      clientName,
      clientContact,
      clientAddress,
      clientPeselNip,
      eventType,
      eventDate,
      startTime,
      endTime,
      endDate,
      duration,
      eventLocation,
      bandComposition,
      instruments,
      eventDescription,
      totalPrice,
      paymentTerms,
      customPaymentTerms,
      depositAmount,
      depositRefundable,
      clientResponsibilities,
      artistResponsibilities,
      cancellationTerms,
      finalContractDeadline
    } = req.body;

    
    if (!offerId || !clientName || !eventDate || !eventLocation || !totalPrice || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Wypełnij wymagane pola'
      });
    }

    
    const offer = await req.db.collection('offers').findOne({
      _id: new ObjectId(offerId)
    });

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: 'Oferta nie znaleziona'
      });
    }

    
    if (offer.userId.equals(new ObjectId(req.user.id))) {
      return res.status(403).json({
        success: false,
        message: 'Nie możesz zarezerwować własnej oferty'
      });
    }

    
    const minDuration = offer.duration?.min || 1;
    const maxDuration = offer.duration?.max || 8;

    if (duration < minDuration || duration > maxDuration) {
      return res.status(400).json({
        success: false,
        message: `Czas trwania musi być między ${minDuration} a ${maxDuration} godzinami`
      });
    }

    
    const existingBooking = await req.db.collection('bookings').findOne({
      offerId: new ObjectId(offerId),
      $or: [
        {
          eventDate: new Date(eventDate),
          status: { $in: ['pending', 'confirmed'] }
        },
        {
          endDate: new Date(endDate || eventDate),
          status: { $in: ['pending', 'confirmed'] }
        }
      ]
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Termin jest już zajęty'
      });
    }

    
    const newBooking = {
      offerId: new ObjectId(offerId),
      artistId: offer.userId,
      clientId: new ObjectId(req.user.id),
      clientName,
      clientContact,
      clientAddress,
      clientPeselNip,
      eventType,
      eventDescription,
      eventDate: new Date(eventDate),
      startTime,
      endTime,
      endDate: endDate ? new Date(endDate) : new Date(eventDate),
      duration: parseInt(duration),
      eventLocation,
      bandComposition: offer.performerType,
      instruments: Array.isArray(instruments) ? instruments : [instruments],
      totalPrice: parseFloat(totalPrice),
      paymentTerms: paymentTerms === 'inny' ? customPaymentTerms : paymentTerms,
      depositAmount: depositAmount ? parseFloat(depositAmount) : null,
      depositRefundable: depositRefundable || false,
      clientResponsibilities,
      artistResponsibilities,
      cancellationTerms,
      finalContractDeadline: finalContractDeadline ? new Date(finalContractDeadline) : null,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await req.db.collection('bookings').insertOne(newBooking);

    await req.db.collection('users').updateOne(
      { _id: new ObjectId(req.user.id) },
      { $addToSet: { unreadBookings: result.insertedId } }
    );

    res.status(201).json({
      success: true,
      message: 'Rezerwacja została wysłana',
      bookingId: result.insertedId
    });

  } catch (error) {
    console.error('Błąd tworzenia rezerwacji:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas tworzenia rezerwacji'
    });
  }
});


router.get('/has-booked/:offerId', authenticate, async (req, res) => {
  try {
    const booking = await req.db.collection('bookings').findOne({
      offerId: new ObjectId(req.params.offerId),
      clientId: new ObjectId(req.user.id),
      status: 'confirmed'
    });

    res.status(200).json({
      success: true,
      hasBooked: !!booking
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Błąd sprawdzania rezerwacji'
    });
  }
});


router.get('/', authenticate, async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {
      $or: [
        { clientId: new ObjectId(req.user.id) },
        { artistId: new ObjectId(req.user.id) }
      ]
    };

    if (status && status !== 'all') {
      filter.status = status;
    }

    const bookings = await req.db.collection('bookings')
      .find(filter)
      .sort({ eventDate: 1 })
      .toArray();

    
    const bookingsWithDetails = await Promise.all(
      bookings.map(async booking => {
        const [offer, artist, client] = await Promise.all([
          req.db.collection('offers').findOne({ _id: booking.offerId }),
          req.db.collection('profiles').findOne({ userId: booking.artistId }),
          req.db.collection('profiles').findOne({ userId: booking.clientId })
        ]);

        return {
          ...booking,
          _id: booking._id.toString(),
          offerId: booking.offerId.toString(),
          artistId: booking.artistId.toString(),
          clientId: booking.clientId.toString(),
          offerName: offer?.artistName || 'Nieznana oferta',
          artistName: artist?.artistName || artist?.displayName || 'Nieznany artysta',
          clientName: client?.organizationName || client?.displayName || 'Nieznany klient',
          artistContact: artist?.phone || artist?.email || '',
          clientContact: client?.phone || client?.email || '',
          eventType: booking.eventType || offer?.eventTypes?.[0] || ''
        };
      })
    );

    res.status(200).json({ success: true, bookings: bookingsWithDetails });
  } catch (error) {
    console.error('Błąd pobierania rezerwacji:', error);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});


router.get('/:id', authenticate, async (req, res) => {
  try {
    const booking = await req.db.collection('bookings').findOne({
      _id: new ObjectId(req.params.id),
      $or: [
        { clientId: new ObjectId(req.user.id) },
        { artistId: new ObjectId(req.user.id) }
      ]
    });

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Rezerwacja nie znaleziona' });
    }

    const [offer, artist, client] = await Promise.all([
      req.db.collection('offers').findOne({ _id: booking.offerId }),
      req.db.collection('profiles').findOne({ userId: booking.artistId }),
      req.db.collection('profiles').findOne({ userId: booking.clientId })
    ]);

    res.status(200).json({
      success: true,
      booking: {
        ...booking,
        _id: booking._id.toString(),
        offerId: booking.offerId.toString(),
        artistId: booking.artistId.toString(),
        clientId: booking.clientId.toString(),
        offerName: offer?.artistName || 'Nieznana oferta',
        artistName: artist?.artistName || artist?.displayName || 'Nieznany artysta',
        artistContact: artist?.email || '',
        artistPhone: artist?.phone || '',
        clientName: client?.organizationName || client?.displayName || 'Nieznany klient',
        clientContact: client?.email || '',
        clientPhone: client?.phone || '',
        clientPeselNip: booking.clientPeselNip || '',
        eventType: booking.eventType || offer?.eventTypes?.[0] || '',
        offerInstruments: offer?.instruments || []
      }
    });
  } catch (error) {
    console.error('Błąd pobierania rezerwacji:', error);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});



router.patch('/:id/status', authenticate, async (req, res) => {
  try {
    const { status, action } = req.body;

    if (!['confirmed', 'rejected', 'cancelled'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Nieprawidłowy status' });
    }

    const booking = await req.db.collection('bookings').findOne({
      _id: new ObjectId(req.params.id),
      $or: [
        { artistId: new ObjectId(req.user.id) },
        { clientId: new ObjectId(req.user.id) }
      ]
    });

    if (!booking) {
      return res.status(403).json({ success: false, message: 'Brak uprawnień' });
    }

    
    if (status === 'confirmed' || action === 'accept_modification') {
      
      const conflictingBookings = await req.db.collection('bookings').find({
        _id: { $ne: new ObjectId(req.params.id) },
        artistId: booking.artistId,
        status: 'confirmed',
        $or: [
          {
            eventDate: { $lte: new Date(booking.endDate || booking.eventDate) },
            endDate: { $gte: new Date(booking.eventDate) }
          },
          {
            eventDate: { $gte: new Date(booking.eventDate) },
            endDate: { $lte: new Date(booking.endDate || booking.eventDate) }
          }
        ]
      }).toArray();

      
      const hasTimeConflict = conflictingBookings.some(conflict => {
        const bookingStart = convertTimeToMinutes(booking.startTime);
        const bookingEnd = convertTimeToMinutes(booking.endTime);
        const conflictStart = convertTimeToMinutes(conflict.startTime);
        const conflictEnd = convertTimeToMinutes(conflict.endTime);

        return (
          (bookingStart < conflictEnd && bookingEnd > conflictStart) ||
          (conflictStart < bookingEnd && conflictEnd > bookingStart)
        );
      });

      if (hasTimeConflict) {
        return res.status(400).json({
          success: false,
          message: 'Termin koliduje z inną zaakceptowaną umową',
          conflictingBookings: conflictingBookings.map(b => ({
            id: b._id,
            eventDate: b.eventDate,
            startTime: b.startTime,
            endTime: b.endTime,
            eventType: b.eventType
          }))
        });
      }
    }

    const newStatus = action === 'accept_modification' ? 'confirmed' : status;
    await req.db.collection('bookings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: { status: newStatus, updatedAt: new Date() } }
    );

    const updatedBooking = await req.db.collection('bookings').findOne({
      _id: new ObjectId(req.params.id)
    });

    if (newStatus === 'confirmed') {
      await updateArtistCalendar(req.db, updatedBooking);
    }

    res.status(200).json({
      success: true,
      message: `Rezerwacja ${newStatus === 'confirmed' ? 'potwierdzona' : 'odrzucona'}`,
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Błąd aktualizacji rezerwacji:', error);
    res.status(500).json({ success: false, message: 'Błąd serwera' });
  }
});


router.patch('/:id/reject-modification', authenticate, async (req, res) => {
  try {
    const booking = await req.db.collection('bookings').findOne({
      _id: new ObjectId(req.params.id),
      clientId: new ObjectId(req.user.id),
      status: 'modified'
    });

    if (!booking) {
      return res.status(403).json({
        success: false,
        message: 'Nie masz uprawnień do odrzucenia modyfikacji'
      });
    }

    const originalValues = {
      eventDate: booking.originalEventDate || booking.eventDate,
      startTime: booking.originalStartTime || booking.startTime,
      endTime: booking.originalEndTime || booking.endTime,
      endDate: booking.originalEndDate || (booking.endDate || booking.eventDate),
      eventLocation: booking.originalEventLocation || booking.eventLocation,
      eventType: booking.originalEventType || booking.eventType,
      eventDescription: booking.originalEventDescription || booking.eventDescription,
      bandComposition: booking.originalBandComposition || booking.bandComposition,
      instruments: booking.originalInstruments || booking.instruments,
      totalPrice: booking.originalTotalPrice || booking.totalPrice,
      paymentTerms: booking.originalPaymentTerms || booking.paymentTerms,
      depositAmount: booking.originalDepositAmount || booking.depositAmount,
      depositRefundable: booking.originalDepositRefundable || booking.depositRefundable,
      clientResponsibilities: booking.originalClientResponsibilities || booking.clientResponsibilities,
      artistResponsibilities: booking.originalArtistResponsibilities || booking.artistResponsibilities,
      cancellationTerms: booking.originalCancellationTerms || booking.cancellationTerms,
      finalContractDeadline: booking.originalFinalContractDeadline || booking.finalContractDeadline,
      status: 'pending',
      updatedAt: new Date()
    };

    await req.db.collection('bookings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: originalValues }
    );

    const updatedBooking = await req.db.collection('bookings').findOne(
      { _id: new ObjectId(req.params.id) }
    );

    res.status(200).json({
      success: true,
      message: 'Modyfikacje zostały odrzucone - przywrócono oryginalną wersję',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Błąd odrzucania modyfikacji:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas odrzucania modyfikacji'
    });
  }
});


router.patch('/:id/modify', authenticate, async (req, res) => {
  try {
    const {
      eventDate,
      startTime,
      endTime,
      endDate,
      eventType,
      eventDescription,
      bandComposition,
      instruments,
      totalPrice,
      paymentTerms,
      depositAmount,
      depositRefundable,
      clientResponsibilities,
      artistResponsibilities,
      cancellationTerms,
      finalContractDeadline
    } = req.body;

    const booking = await req.db.collection('bookings').findOne({
      _id: new ObjectId(req.params.id),
      artistId: new ObjectId(req.user.id),
      status: 'pending'
    });

    if (!booking) {
      return res.status(403).json({
        success: false,
        message: 'Nie masz uprawnień do modyfikacji tej umowy'
      });
    }

    
    if (eventDate && isBefore(parseISO(eventDate), new Date())) {
      return res.status(400).json({
        success: false,
        message: 'Data wydarzenia nie może być w przeszłości'
      });
    }

    if (endDate && isBefore(parseISO(endDate), new Date())) {
      return res.status(400).json({
        success: false,
        message: 'Data zakończenia nie może być w przeszłości'
      });
    }

    
    const existingBooking = await req.db.collection('bookings').findOne({
      _id: { $ne: new ObjectId(req.params.id) },
      artistId: new ObjectId(req.user.id),
      $or: [
        {
          eventDate: eventDate ? new Date(eventDate) : booking.eventDate,
          status: { $in: ['pending', 'confirmed'] }
        },
        {
          endDate: endDate ? new Date(endDate) : (booking.endDate || booking.eventDate),
          status: { $in: ['pending', 'confirmed'] }
        }
      ]
    });

    if (existingBooking) {
      return res.status(400).json({
        success: false,
        message: 'Termin jest już zajęty'
      });
    }

    const updateData = {
      eventDate: eventDate ? new Date(eventDate) : booking.eventDate,
      startTime: startTime || booking.startTime,
      endTime: endTime || booking.endTime,
      endDate: endDate ? new Date(endDate) : (booking.endDate || booking.eventDate),
      eventType: eventType || booking.eventType,
      eventDescription: eventDescription || booking.eventDescription,
      bandComposition: bandComposition || booking.bandComposition,
      instruments: instruments || booking.instruments,
      totalPrice: totalPrice ? parseFloat(totalPrice) : booking.totalPrice,
      paymentTerms: paymentTerms || booking.paymentTerms,
      depositAmount: depositAmount ? parseFloat(depositAmount) : booking.depositAmount,
      depositRefundable: depositRefundable !== undefined ? depositRefundable : booking.depositRefundable,
      clientResponsibilities: clientResponsibilities || booking.clientResponsibilities,
      artistResponsibilities: artistResponsibilities || booking.artistResponsibilities,
      cancellationTerms: cancellationTerms || booking.cancellationTerms,
      finalContractDeadline: finalContractDeadline ? new Date(finalContractDeadline) : booking.finalContractDeadline,
      status: 'modified',
      updatedAt: new Date(),
      
      originalEventDate: booking.eventDate,
      originalStartTime: booking.startTime,
      originalEndTime: booking.endTime,
      originalEndDate: booking.endDate || booking.eventDate,
      originalEventLocation: booking.eventLocation,
      originalEventType: booking.eventType,
      originalEventDescription: booking.eventDescription,
      originalBandComposition: booking.bandComposition,
      originalInstruments: booking.instruments,
      originalTotalPrice: booking.totalPrice,
      originalPaymentTerms: booking.paymentTerms,
      originalDepositAmount: booking.depositAmount,
      originalDepositRefundable: booking.depositRefundable,
      originalClientResponsibilities: booking.clientResponsibilities,
      originalArtistResponsibilities: booking.artistResponsibilities,
      originalCancellationTerms: booking.cancellationTerms,
      originalFinalContractDeadline: booking.finalContractDeadline
    };

    await req.db.collection('bookings').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: updateData }
    );

    await req.db.collection('users').updateOne(
      { _id: booking.clientId },
      { $addToSet: { unreadBookings: new ObjectId(req.params.id) } }
    );

    const updatedBooking = await req.db.collection('bookings').findOne(
      { _id: new ObjectId(req.params.id) }
    );

    res.status(200).json({
      success: true,
      message: 'Umowa została zmodyfikowana i oczekuje na akceptację klienta',
      booking: updatedBooking
    });

  } catch (error) {
    console.error('Błąd modyfikacji umowy:', error);
    res.status(500).json({
      success: false,
      message: 'Wystąpił błąd podczas modyfikacji umowy'
    });
  }
});

export default router;